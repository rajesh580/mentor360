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

export default router;
