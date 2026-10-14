import { Router, Request, Response } from 'express';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';
import { logAudit } from '../../middlewares/audit.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/communication/all-logs - List institution-wide parent communications
router.get(
  '/all-logs',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PRINCIPAL', 'HOD', 'PROCTOR_COORDINATOR', 'PROCTOR']),
  async (req: Request, res: Response) => {
    try {
      const institutionId = req.tenantId;
      const { channel, search, limit = 50 } = req.query;

      let sql = `
        SELECT pc.*,
               s.full_name as student_name, s.usn as student_usn, s.current_semester,
               d.code as department_code,
               g.name as guardian_name, g.phone as guardian_phone, g.relation,
               u.full_name as sent_by_name
        FROM parent_communications pc
        JOIN students s ON pc.student_id = s.id
        JOIN departments d ON s.department_id = d.id
        JOIN guardians g ON pc.guardian_id = g.id
        JOIN users u ON pc.initiated_by = u.id
        WHERE pc.institution_id = $1
      `;
      const params: any[] = [institutionId];

      if (channel) {
        params.push(channel);
        sql += ` AND pc.channel = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        sql += ` AND (s.full_name ILIKE $${params.length} OR s.usn ILIKE $${params.length} OR g.name ILIKE $${params.length} OR pc.subject ILIKE $${params.length})`;
      }

      sql += ` ORDER BY pc.sent_at DESC LIMIT $${params.length + 1}`;
      params.push(Number(limit) || 50);

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      console.error('Failed to retrieve all communication logs:', err);
      res.status(500).json({ error: 'Failed to retrieve communication logs.' });
    }
  }
);

// GET /api/communication/parent-logs/:studentId - List communication records for specific student
router.get('/parent-logs/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const result = await query(
      `SELECT pc.*, g.name as guardian_name, g.phone as guardian_phone, u.full_name as sent_by_name
       FROM parent_communications pc
       JOIN guardians g ON pc.guardian_id = g.id
       JOIN users u ON pc.initiated_by = u.id
       WHERE pc.student_id = $1
       ORDER BY pc.sent_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve communication logs.' });
  }
});

// POST /api/communication/send - Record or dispatch individual parent message
router.post(
  '/send',
  logAudit('DISPATCH_COMMUNICATION', 'PARENT_COMMUNICATION'),
  async (req: Request, res: Response) => {
    try {
      const { studentId, guardianId, channel, subject, message } = req.body;
      const institutionId = req.tenantId;
      const userId = req.user!.id;

      if (!studentId || !subject || !message) {
        return res.status(400).json({ error: 'Student, subject, and message are required.' });
      }

      // If guardianId is not provided, look up student's primary guardian
      let targetGuardianId = guardianId;
      if (!targetGuardianId) {
        const gRes = await query(
          `SELECT guardian_id FROM student_guardians WHERE student_id = $1 ORDER BY is_primary DESC LIMIT 1`,
          [studentId]
        );
        if (gRes.rows.length > 0) {
          targetGuardianId = gRes.rows[0].guardian_id;
        } else {
          return res.status(400).json({ error: 'No guardian on record for this student.' });
        }
      }

      const result = await query(
        `INSERT INTO parent_communications (
           institution_id, student_id, guardian_id, initiated_by, channel, subject, message, delivery_status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'SENT')
         RETURNING *`,
        [institutionId, studentId, targetGuardianId, userId, channel || 'SMS', subject, message]
      );

      res.status(201).json({ message: 'Communication logged & dispatched successfully', record: result.rows[0] });
    } catch (err) {
      console.error('Failed to log parent communication:', err);
      res.status(500).json({ error: 'Failed to log parent communication.' });
    }
  }
);

// POST /api/communication/broadcast - Broadcast notice to parents
router.post(
  '/broadcast',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PRINCIPAL', 'HOD', 'PROCTOR_COORDINATOR']),
  logAudit('BROADCAST_COMMUNICATION', 'PARENT_COMMUNICATION'),
  async (req: Request, res: Response) => {
    const client = await getClient();
    try {
      const { targetGroup, departmentId, semester, channel, subject, message } = req.body;
      const institutionId = req.tenantId;
      const userId = req.user!.id;

      if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message are required.' });
      }

      await client.query('BEGIN');

      // Find target students
      let studentSql = `
        SELECT s.id, sg.guardian_id
        FROM students s
        JOIN student_guardians sg ON s.id = sg.student_id AND sg.is_primary = true
        WHERE s.institution_id = $1
      `;
      const params: any[] = [institutionId];

      if (targetGroup === 'ATTENDANCE_SHORTAGE') {
        studentSql += ` AND s.id IN (SELECT student_id FROM attendance_records WHERE institution_id = $1 AND is_shortage = true)`;
      } else if (targetGroup === 'DEPARTMENT' && departmentId) {
        params.push(departmentId);
        studentSql += ` AND s.department_id = $${params.length}`;
      } else if (targetGroup === 'SEMESTER' && semester) {
        params.push(Number(semester));
        studentSql += ` AND s.current_semester = $${params.length}`;
      }

      const targetStudents = await client.query(studentSql, params);
      let dispatchedCount = 0;

      for (const row of targetStudents.rows) {
        await client.query(
          `INSERT INTO parent_communications (
             institution_id, student_id, guardian_id, initiated_by, channel, subject, message, delivery_status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'SENT')`,
          [institutionId, row.id, row.guardian_id, userId, channel || 'SMS', subject, message]
        );
        dispatchedCount++;
      }

      await client.query('COMMIT');
      res.status(201).json({
        message: `Broadcast successfully dispatched to ${dispatchedCount} parents.`,
        dispatchedCount,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Failed to broadcast parent communication:', err);
      res.status(500).json({ error: 'Failed to broadcast communication.' });
    } finally {
      client.release();
    }
  }
);

// GET /api/communication/parent-portal - Restricted Parent Portal View
router.get('/parent-portal', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const institutionId = req.tenantId;

    // 1. Find guardian record for authenticated user
    const guardianRes = await query(
      `SELECT g.* FROM guardians g
       WHERE (g.user_id = $1 OR g.email = $2) AND g.institution_id = $3
       LIMIT 1`,
      [userId, userEmail, institutionId]
    );

    if (guardianRes.rows.length === 0) {
      return res.status(404).json({ error: 'No parent/guardian profile linked to your user account.' });
    }

    const guardian = guardianRes.rows[0];

    // 2. Fetch all verified students linked to this guardian
    const linkedStudentsRes = await query(
      `SELECT s.*, d.name as department_name, d.code as department_code,
              sg.is_primary, sg.verified,
              u_f.full_name as mentor_name, u_f.email as mentor_email, u_f.phone as mentor_phone,
              f.designation as mentor_designation, f.employee_id as mentor_emp_id
       FROM student_guardians sg
       JOIN students s ON sg.student_id = s.id
       JOIN departments d ON s.department_id = d.id
       LEFT JOIN proctor_allocations pa ON s.id = pa.student_id AND pa.status = 'ACTIVE'
       LEFT JOIN faculty f ON pa.faculty_id = f.id
       LEFT JOIN users u_f ON f.user_id = u_f.id
       WHERE sg.guardian_id = $1 AND sg.verified = true`,
      [guardian.id]
    );

    const studentsWithDetails = await Promise.all(
      linkedStudentsRes.rows.map(async (stu) => {
        // Attendance
        const attRes = await query(
          `SELECT ar.*, sub.code as subject_code, sub.name as subject_name
           FROM attendance_records ar
           JOIN subjects sub ON ar.subject_id = sub.id
           WHERE ar.student_id = $1 AND ar.semester_number = $2
           ORDER BY sub.code ASC`,
          [stu.id, stu.current_semester]
        );

        let totalHeld = 0;
        let totalAtt = 0;
        let hasShortage = false;
        attRes.rows.forEach((r) => {
          totalHeld += Number(r.classes_held || 0);
          totalAtt += Number(r.classes_attended || 0);
          if (r.is_shortage) hasShortage = true;
        });

        const overallAttPercentage = totalHeld > 0 ? Number(((totalAtt / totalHeld) * 100).toFixed(1)) : 100;

        // Marks
        const marksRes = await query(
          `SELECT mr.*, sub.code as subject_code, sub.name as subject_name
           FROM mark_records mr
           JOIN subjects sub ON mr.subject_id = sub.id
           WHERE mr.student_id = $1 AND mr.semester_number = $2
           ORDER BY sub.code ASC`,
          [stu.id, stu.current_semester]
        );

        // Result Summary
        const summaryRes = await query(
          `SELECT * FROM result_summaries WHERE student_id = $1 ORDER BY semester_number DESC LIMIT 1`,
          [stu.id]
        );

        // Communications sent to guardian regarding this student
        const commsRes = await query(
          `SELECT * FROM parent_communications WHERE student_id = $1 AND guardian_id = $2 ORDER BY sent_at DESC LIMIT 10`,
          [stu.id, guardian.id]
        );

        return {
          student: stu,
          attendance: attRes.rows,
          overallAttendance: {
            classesHeld: totalHeld,
            classesAttended: totalAtt,
            percentage: overallAttPercentage,
            hasShortage: overallAttPercentage < 75 || hasShortage,
          },
          marks: marksRes.rows,
          latestSummary: summaryRes.rows[0] || null,
          communications: commsRes.rows,
        };
      })
    );

    res.json({
      guardian,
      linkedStudents: studentsWithDetails,
    });
  } catch (err) {
    console.error('Failed to get parent portal data:', err);
    res.status(500).json({ error: 'Failed to retrieve parent portal data.' });
  }
});

// GET /api/communication/notifications - Get current user notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// PATCH /api/communication/notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await query(`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`, [id, userId]);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// POST /api/communication/notifications/read-all - Mark all as read
router.post('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [userId]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

export default router;
