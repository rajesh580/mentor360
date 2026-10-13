import { Router, Request, Response } from 'express';
import multer from 'multer';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';
import { logAudit } from '../../middlewares/audit.middleware.js';
import { saveFileToDatabase } from '../../services/storage.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(authenticate, tenantMiddleware);

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
