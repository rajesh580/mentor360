import { Router, Request, Response } from 'express';
import multer from 'multer';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';
import { logAudit } from '../../middlewares/audit.middleware.js';
import { saveFileToDatabase } from '../../services/storage.service.js';
import { cacheService } from '../../services/cache.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(authenticate, tenantMiddleware);

// GET /api/students/me/dashboard - Student Self-Service Success Portal
router.get('/me/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const institutionId = req.tenantId;

    // Find student record associated with authenticated user
    const studentLookup = await query(
      `SELECT s.*, d.name as department_name, d.code as department_code,
              p.name as programme_name, b.name as batch_name
       FROM students s
       JOIN departments d ON s.department_id = d.id
       JOIN programmes p ON s.programme_id = p.id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE (s.user_id = $1 OR s.email = $2) AND s.institution_id = $3
       LIMIT 1`,
      [userId, req.user!.email, institutionId]
    );

    if (studentLookup.rows.length === 0) {
      return res.status(404).json({ error: 'No student profile linked to this user account.' });
    }

    const student = studentLookup.rows[0];
    const studentId = student.id;

    // 1. Assigned Mentor / Proctor details
    const mentorRes = await query(
      `SELECT pa.*, f.employee_id, f.designation, f.specialization,
              u.full_name as mentor_name, u.email as mentor_email, u.phone as mentor_phone
       FROM proctor_allocations pa
       JOIN faculty f ON pa.faculty_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE pa.student_id = $1 AND pa.status = 'ACTIVE'`,
      [studentId]
    );

    // 2. Marks (IA1, IA2, Avg IA, External VTU)
    const marksRes = await query(
      `SELECT mr.*, sub.code as subject_code, sub.name as subject_name, sub.credits
       FROM mark_records mr
       JOIN subjects sub ON mr.subject_id = sub.id
       WHERE mr.student_id = $1 AND mr.semester_number = $2
       ORDER BY sub.code ASC`,
      [studentId, student.current_semester]
    );

    // 3. Attendance
    const attendanceRes = await query(
      `SELECT ar.*, sub.code as subject_code, sub.name as subject_name
       FROM attendance_records ar
       JOIN subjects sub ON ar.subject_id = sub.id
       WHERE ar.student_id = $1 AND ar.semester_number = $2
       ORDER BY sub.code ASC`,
      [studentId, student.current_semester]
    );

    // 4. Result summaries (SGPA/CGPA)
    const summaryRes = await query(
      `SELECT * FROM result_summaries WHERE student_id = $1 ORDER BY semester_number DESC`,
      [studentId]
    );

    // 5. Mentoring meetings
    const meetingsRes = await query(
      `SELECT mm.id, mm.title, mm.meeting_type, mm.scheduled_at, mm.venue, mm.status,
              mp.attendance_status, mp.discussion_notes, mp.identified_challenges, mp.student_feedback,
              u.full_name as mentor_name
       FROM meeting_participants mp
       JOIN mentoring_meetings mm ON mp.meeting_id = mm.id
       JOIN faculty f ON mm.faculty_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE mp.student_id = $1
       ORDER BY mm.scheduled_at DESC`,
      [studentId]
    );

    // 6. Action plans / Interventions
    const issuesRes = await query(
      `SELECT si.id, si.category, si.severity, si.title, si.description, si.status,
              ap.id as action_plan_id, ap.title as action_title, ap.objective, ap.target_date, ap.status as action_status
       FROM student_issues si
       LEFT JOIN action_plans ap ON si.id = ap.issue_id
       WHERE si.student_id = $1
       ORDER BY si.created_at DESC`,
      [studentId]
    );

    // 7. Goals, Skills, Certificates, Internships
    const [goalsRes, certsRes, skillsRes, internRes] = await Promise.all([
      query(`SELECT * FROM student_goals WHERE student_id = $1 ORDER BY created_at DESC`, [studentId]),
      query(`SELECT * FROM certificates WHERE student_id = $1 ORDER BY issue_date DESC`, [studentId]),
      query(
        `SELECT sk.name, sk.category, ss.proficiency
         FROM student_skills ss
         JOIN skills sk ON ss.skill_id = sk.id
         WHERE ss.student_id = $1`,
        [studentId]
      ),
      query(`SELECT * FROM internships WHERE student_id = $1 ORDER BY start_date DESC`, [studentId]),
    ]);

    // 8. Calculate attendance stats
    let totalClassesHeld = 0;
    let totalClassesAttended = 0;
    let hasShortage = false;

    attendanceRes.rows.forEach((r: any) => {
      totalClassesHeld += Number(r.classes_held || 0);
      totalClassesAttended += Number(r.classes_attended || 0);
      if (r.is_shortage) hasShortage = true;
    });

    const overallPercentage = totalClassesHeld > 0 ? Number(((totalClassesAttended / totalClassesHeld) * 100).toFixed(1)) : 100;

    res.json({
      student,
      currentMentor: mentorRes.rows[0] || null,
      marks: marksRes.rows,
      attendance: attendanceRes.rows,
      overallAttendance: {
        classesHeld: totalClassesHeld,
        classesAttended: totalClassesAttended,
        percentage: overallPercentage,
        hasShortage: overallPercentage < 75 || hasShortage,
      },
      latestSummary: summaryRes.rows[0] || null,
      meetings: meetingsRes.rows,
      interventions: issuesRes.rows,
      development: {
        goals: goalsRes.rows,
        certificates: certsRes.rows,
        skills: skillsRes.rows,
        internships: internRes.rows,
      },
    });
  } catch (err) {
    console.error('Error fetching student portal dashboard:', err);
    res.status(500).json({ error: 'Failed to retrieve student portal data.' });
  }
});

// POST /api/students/me/request-meeting - Student requests a 1-on-1 meeting with mentor
router.post('/me/request-meeting', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const institutionId = req.tenantId;
    const { reason, preferredDate } = req.body;

    const studentLookup = await query(
      `SELECT s.id, s.full_name, s.usn, pa.faculty_id, f.user_id as mentor_user_id
       FROM students s
       JOIN proctor_allocations pa ON s.id = pa.student_id AND pa.status = 'ACTIVE'
       JOIN faculty f ON pa.faculty_id = f.id
       WHERE (s.user_id = $1 OR s.email = $2) AND s.institution_id = $3
       LIMIT 1`,
      [userId, req.user!.email, institutionId]
    );

    if (studentLookup.rows.length === 0) {
      return res.status(400).json({ error: 'No active proctor assigned to your student profile.' });
    }

    const { id: studentId, full_name, usn, faculty_id, mentor_user_id } = studentLookup.rows[0];

    // Create a scheduled meeting record marked as student-initiated
    const meetingRes = await query(
      `INSERT INTO mentoring_meetings (
         institution_id, faculty_id, title, meeting_type, scheduled_at, venue, status, general_remarks
       )
       VALUES ($1, $2, $3, 'INDIVIDUAL', $4, 'Proctor Cabin', 'SCHEDULED', $5)
       RETURNING id`,
      [
        institutionId,
        faculty_id,
        `Mentoring Request from ${full_name} (${usn})`,
        preferredDate || new Date(Date.now() + 24 * 3600 * 1000),
        `Student Reason: ${reason || 'Academic & general mentoring discussion requested by mentee.'}`,
      ]
    );

    await query(
      `INSERT INTO meeting_participants (meeting_id, student_id, attendance_status, discussion_notes)
       VALUES ($1, $2, 'PENDING', $3)`,
      [meetingRes.rows[0].id, studentId, `Requested on: ${new Date().toISOString()}`]
    );

    // Send notification to mentor
    await query(
      `INSERT INTO notifications (institution_id, user_id, title, message, type)
       VALUES ($1, $2, 'New Mentoring Meeting Request', $3, 'MEETING')`,
      [
        institutionId,
        mentor_user_id,
        `Mentee ${full_name} (${usn}) has requested a mentoring meeting: "${reason || 'Discussion requested'}"`,
      ]
    );

    cacheService.invalidateTags(['reports', 'meetings']);
    res.status(201).json({ message: 'Mentoring meeting request submitted to your mentor successfully.' });
  } catch (err) {
    console.error('Error submitting meeting request:', err);
    res.status(500).json({ error: 'Failed to submit meeting request.' });
  }
});

// GET /api/students - List students with filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;
    const { departmentId, semester, search, mentorFacultyId } = req.query;

    let sql = `
      SELECT s.id, s.usn, s.full_name, s.email, s.phone, s.current_semester, s.current_section, s.status,
             d.name as department_name, d.code as department_code,
             f.id as faculty_id, u_f.full_name as mentor_name, f.designation as mentor_designation
      FROM students s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN proctor_allocations pa ON s.id = pa.student_id AND pa.status = 'ACTIVE'
      LEFT JOIN faculty f ON pa.faculty_id = f.id
      LEFT JOIN users u_f ON f.user_id = u_f.id
      WHERE s.institution_id = $1
    `;
    const params: any[] = [institutionId];

    if (departmentId) {
      params.push(departmentId);
      sql += ` AND s.department_id = $${params.length}`;
    }

    if (semester) {
      params.push(Number(semester));
      sql += ` AND s.current_semester = $${params.length}`;
    }

    if (mentorFacultyId) {
      params.push(mentorFacultyId);
      sql += ` AND pa.faculty_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (s.full_name ILIKE $${params.length} OR s.usn ILIKE $${params.length})`;
    }

    sql += ` ORDER BY s.usn ASC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to retrieve students list.' });
  }
});

// POST /api/students - Register a new student record with guardian details
router.post(
  '/',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR_COORDINATOR']),
  logAudit('REGISTER_STUDENT', 'STUDENT'),
  async (req: Request, res: Response) => {
    const client = await getClient();
    try {
      const {
        usn,
        fullName,
        email,
        phone,
        departmentId,
        programmeId,
        batchId,
        currentSemester,
        currentSection,
        guardianName,
        guardianRelation,
        guardianPhone,
        guardianEmail,
      } = req.body;
      const institutionId = req.tenantId;

      if (!usn || !fullName || !departmentId) {
        return res.status(400).json({ error: 'USN, full name, and department are required.' });
      }

      await client.query('BEGIN');

      // 1. If programmeId not provided, select first programme for the department
      let progId = programmeId;
      if (!progId) {
        const progRes = await client.query(
          `SELECT id FROM programmes WHERE department_id = $1 AND institution_id = $2 LIMIT 1`,
          [departmentId, institutionId]
        );
        if (progRes.rows.length > 0) progId = progRes.rows[0].id;
      }

      // 2. Insert Student
      const studentRes = await client.query(
        `INSERT INTO students (
           institution_id, department_id, programme_id, batch_id, usn, full_name, email, phone, current_semester, current_section, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
         RETURNING *`,
        [
          institutionId,
          departmentId,
          progId,
          batchId || null,
          usn.trim().toUpperCase(),
          fullName.trim(),
          email?.trim() || `${usn.trim().toLowerCase()}@svit.edu.in`,
          phone?.trim() || null,
          Number(currentSemester) || 1,
          currentSection?.trim().toUpperCase() || 'A',
        ]
      );
      const student = studentRes.rows[0];

      // 3. Insert guardian if provided
      if (guardianName && guardianPhone) {
        const guardianRes = await client.query(
          `INSERT INTO guardians (institution_id, name, relation, phone, email)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            institutionId,
            guardianName.trim(),
            guardianRelation || 'Father',
            guardianPhone.trim(),
            guardianEmail?.trim() || null,
          ]
        );
        const guardianId = guardianRes.rows[0].id;

        await client.query(
          `INSERT INTO student_guardians (student_id, guardian_id, is_primary, verified)
           VALUES ($1, $2, true, true)`,
          [student.id, guardianId]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Student registered successfully.', student });
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: 'A student with this USN already exists.' });
      }
      console.error('Error creating student:', err);
      res.status(500).json({ error: 'Failed to create student record.' });
    } finally {
      client.release();
    }
  }
);

// PATCH /api/students/:id/status - Update student status (ACTIVE / GRADUATED / TRANSFERRED / DROPPED)
router.patch(
  '/:id/status',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD']),
  logAudit('UPDATE_STUDENT_STATUS', 'STUDENT'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const institutionId = req.tenantId;

      if (!['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'DROPPED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
      }

      const result = await query(
        `UPDATE students SET status = $1, updated_at = NOW() WHERE id = $2 AND institution_id = $3 RETURNING id, usn, full_name, status`,
        [status, id, institutionId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      res.json({ message: `Student status updated to ${status}`, student: result.rows[0] });
    } catch (err) {
      console.error('Failed to update student status:', err);
      res.status(500).json({ error: 'Failed to update student status.' });
    }
  }
);

// GET /api/students/:id/proctor-file - Complete 360-degree Digital Student Success Record
router.get('/:id/proctor-file', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const institutionId = req.tenantId;

    // 1. Basic Student Info
    const studentRes = await query(
      `SELECT s.*, d.name as department_name, d.code as department_code,
              p.name as programme_name, b.name as batch_name
       FROM students s
       JOIN departments d ON s.department_id = d.id
       JOIN programmes p ON s.programme_id = p.id
       LEFT JOIN batches b ON s.batch_id = b.id
       WHERE s.id = $1 AND s.institution_id = $2`,
      [id, institutionId]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const student = studentRes.rows[0];

    // 2. Active Mentor & Proctor Allocation
    const mentorRes = await query(
      `SELECT pa.*, f.employee_id, f.designation, u.full_name as mentor_name, u.email as mentor_email, u.phone as mentor_phone
       FROM proctor_allocations pa
       JOIN faculty f ON pa.faculty_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE pa.student_id = $1 AND pa.status = 'ACTIVE'`,
      [id]
    );

    // 3. Academic Marks (IA1, IA2, Avg IA out of 50, VTU external)
    const marksRes = await query(
      `SELECT mr.*, sub.code as subject_code, sub.name as subject_name, sub.credits
       FROM mark_records mr
       JOIN subjects sub ON mr.subject_id = sub.id
       WHERE mr.student_id = $1 AND mr.semester_number = $2
       ORDER BY sub.code ASC`,
      [id, student.current_semester]
    );

    // 4. Attendance Records
    const attendanceRes = await query(
      `SELECT ar.*, sub.code as subject_code, sub.name as subject_name
       FROM attendance_records ar
       JOIN subjects sub ON ar.subject_id = sub.id
       WHERE ar.student_id = $1 AND ar.semester_number = $2
       ORDER BY sub.code ASC`,
      [id, student.current_semester]
    );

    // 5. Mentoring History & Meeting Notes
    const meetingsRes = await query(
      `SELECT mm.id, mm.title, mm.meeting_type, mm.scheduled_at, mm.venue, mm.status,
              mp.attendance_status, mp.discussion_notes, mp.identified_challenges, mp.student_feedback,
              u.full_name as conducted_by_name
       FROM meeting_participants mp
       JOIN mentoring_meetings mm ON mp.meeting_id = mm.id
       JOIN faculty f ON mm.faculty_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE mp.student_id = $1
       ORDER BY mm.scheduled_at DESC`,
      [id]
    );

    // 6. Student Issues, Concerns & Action Plans
    const issuesRes = await query(
      `SELECT si.*, u.full_name as raised_by_name,
              json_agg(json_build_object(
                'id', ap.id,
                'title', ap.title,
                'objective', ap.objective,
                'target_date', ap.target_date,
                'status', ap.status
              )) FILTER (WHERE ap.id IS NOT NULL) as action_plans
       FROM student_issues si
       JOIN users u ON si.raised_by = u.id
       LEFT JOIN action_plans ap ON si.id = ap.issue_id
       WHERE si.student_id = $1
       GROUP BY si.id, u.full_name
       ORDER BY si.created_at DESC`,
      [id]
    );

    // 7. Student Development (Goals, Skills, Certificates)
    const [goalsRes, certsRes, skillsRes] = await Promise.all([
      query(`SELECT * FROM student_goals WHERE student_id = $1 ORDER BY created_at DESC`, [id]),
      query(`SELECT * FROM certificates WHERE student_id = $1 ORDER BY issue_date DESC`, [id]),
      query(
        `SELECT sk.name, sk.category, ss.proficiency
         FROM student_skills ss
         JOIN skills sk ON ss.skill_id = sk.id
         WHERE ss.student_id = $1`,
        [id]
      ),
    ]);

    // 8. Guardian Information
    const guardianRes = await query(
      `SELECT g.*, sg.is_primary, sg.verified
       FROM student_guardians sg
       JOIN guardians g ON sg.guardian_id = g.id
       WHERE sg.student_id = $1`,
      [id]
    );

    // 9. Student Documents stored in database
    const documentsRes = await query(
      `SELECT sd.id, sd.category, sd.title, sd.file_url, sd.file_size, sd.is_confidential, sd.created_at,
              u.full_name as uploaded_by_name
       FROM student_documents sd
       LEFT JOIN users u ON sd.uploaded_by = u.id
       WHERE sd.student_id = $1 AND sd.institution_id = $2
       ORDER BY sd.created_at DESC`,
      [id, institutionId]
    );

    res.json({
      student,
      currentMentor: mentorRes.rows[0] || null,
      marks: marksRes.rows,
      attendance: attendanceRes.rows,
      mentoringHistory: meetingsRes.rows,
      concernsAndInterventions: issuesRes.rows,
      development: {
        goals: goalsRes.rows,
        certificates: certsRes.rows,
        skills: skillsRes.rows,
      },
      guardians: guardianRes.rows,
      documents: documentsRes.rows,
    });
  } catch (err) {
    console.error('Error fetching proctor file:', err);
    res.status(500).json({ error: 'Failed to retrieve digital proctor file.' });
  }
});

// POST /api/students/:id/documents - Upload and store document directly into the database (BYTEA)
router.post(
  '/:id/documents',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR', 'COUNSELLOR', 'STUDENT']),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { category, title, isConfidential } = req.body;
      const institutionId = req.tenantId!;
      const userId = req.user?.id || null;

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided for upload.' });
      }

      // 1. Save binary file directly into PostgreSQL database (BYTEA column)
      const storedFile = await saveFileToDatabase({
        institutionId,
        fileName: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        buffer: req.file.buffer,
        category: 'STUDENT_DOC',
        uploadedBy: userId,
      });

      // 2. Link in student_documents table
      const docRes = await query(
        `INSERT INTO student_documents (
           institution_id, student_id, category, title, file_url, file_size, file_data, is_confidential, uploaded_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, category, title, file_url, file_size, is_confidential, created_at`,
        [
          institutionId,
          id,
          category || 'CERTIFICATE',
          title || req.file.originalname,
          storedFile.file_url,
          req.file.size,
          req.file.buffer,
          isConfidential === 'true' || isConfidential === true,
          userId,
        ]
      );

      return res.status(201).json({
        message: 'File stored into database successfully.',
        document: docRes.rows[0],
        file: storedFile,
      });
    } catch (err) {
      console.error('Error storing student document:', err);
      return res.status(500).json({ error: 'Failed to store document in database.' });
    }
  }
);

// GET /api/students/:id/documents - List documents stored for student
router.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const institutionId = req.tenantId;

    const result = await query(
      `SELECT sd.id, sd.category, sd.title, sd.file_url, sd.file_size, sd.is_confidential, sd.created_at,
              u.full_name as uploaded_by_name
       FROM student_documents sd
       LEFT JOIN users u ON sd.uploaded_by = u.id
       WHERE sd.student_id = $1 AND sd.institution_id = $2
       ORDER BY sd.created_at DESC`,
      [id, institutionId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('Error retrieving student documents:', err);
    return res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
});

export default router;
