import { Router, Request, Response } from 'express';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/development/student/:studentId
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const [goals, certs, internships, skills] = await Promise.all([
      query(`SELECT * FROM student_goals WHERE student_id = $1 ORDER BY created_at DESC`, [studentId]),
      query(`SELECT * FROM certificates WHERE student_id = $1 ORDER BY issue_date DESC`, [studentId]),
      query(`SELECT * FROM internships WHERE student_id = $1 ORDER BY start_date DESC`, [studentId]),
      query(
        `SELECT sk.name, sk.category, ss.proficiency, ss.id as student_skill_id
         FROM student_skills ss
         JOIN skills sk ON ss.skill_id = sk.id
         WHERE ss.student_id = $1`,
        [studentId]
      ),
    ]);

    res.json({
      goals: goals.rows,
      certificates: certs.rows,
      internships: internships.rows,
      skills: skills.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve development records.' });
  }
});

// GET /api/development/placement-summary - Career Readiness & Placement Hub Metrics
router.get(
  '/placement-summary',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PRINCIPAL', 'HOD', 'PLACEMENT_OFFICER']),
  async (req: Request, res: Response) => {
    try {
      const institutionId = req.tenantId;

      const [internshipsRes, certsRes, skillsRes, studentCountRes] = await Promise.all([
        query(
          `SELECT i.*, s.usn, s.full_name as student_name, d.code as department_code
           FROM internships i
           JOIN students s ON i.student_id = s.id
           JOIN departments d ON s.department_id = d.id
           WHERE s.institution_id = $1
           ORDER BY i.created_at DESC`,
          [institutionId]
        ),
        query(
          `SELECT c.*, s.usn, s.full_name as student_name, d.code as department_code
           FROM certificates c
           JOIN students s ON c.student_id = s.id
           JOIN departments d ON s.department_id = d.id
           WHERE s.institution_id = $1
           ORDER BY c.issue_date DESC`,
          [institutionId]
        ),
        query(
          `SELECT sk.name as skill_name, sk.category, COUNT(ss.id) as student_count
           FROM skills sk
           LEFT JOIN student_skills ss ON sk.id = ss.skill_id
           WHERE sk.institution_id = $1
           GROUP BY sk.id, sk.name, sk.category
           ORDER BY student_count DESC`,
          [institutionId]
        ),
        query(`SELECT COUNT(*) as count FROM students WHERE institution_id = $1`, [institutionId]),
      ]);

      const totalStudents = parseInt(studentCountRes.rows[0].count) || 0;
      const uniqueInterns = new Set(internshipsRes.rows.map((r) => r.student_id)).size;
      const verifiedCerts = certsRes.rows.filter((c) => c.verified).length;

      res.json({
        totalStudents,
        studentsWithInternships: uniqueInterns,
        totalCertificates: certsRes.rows.length,
        verifiedCertificates: verifiedCerts,
        internships: internshipsRes.rows,
        certificates: certsRes.rows,
        skillsDistribution: skillsRes.rows,
      });
    } catch (err) {
      console.error('Failed to get placement summary:', err);
      res.status(500).json({ error: 'Failed to retrieve placement metrics.' });
    }
  }
);

// GET /api/development/placement-eligible - Filter students eligible for placement drives
router.get(
  '/placement-eligible',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PRINCIPAL', 'HOD', 'PLACEMENT_OFFICER']),
  async (req: Request, res: Response) => {
    try {
      const institutionId = req.tenantId;
      const { minCgpa = 7.0, maxBacklogs = 0, minAttendance = 75 } = req.query;

      const sql = `
        SELECT s.id, s.usn, s.full_name, s.email, s.phone, s.current_semester,
               d.code as department_code,
               COALESCE(rs.cgpa, 0) as cgpa,
               COALESCE(rs.active_backlogs, 0) as active_backlogs,
               COALESCE(att.avg_percentage, 100) as attendance_percentage,
               COUNT(DISTINCT i.id) as internships_count,
               COUNT(DISTINCT c.id) as certificates_count
        FROM students s
        JOIN departments d ON s.department_id = d.id
        LEFT JOIN result_summaries rs ON s.id = rs.student_id
        LEFT JOIN (
          SELECT student_id, ROUND(AVG(percentage)::numeric, 1) as avg_percentage
          FROM attendance_records
          GROUP BY student_id
        ) att ON s.id = att.student_id
        LEFT JOIN internships i ON s.id = i.student_id
        LEFT JOIN certificates c ON s.id = c.student_id AND c.verified = true
        WHERE s.institution_id = $1
          AND COALESCE(rs.cgpa, 0) >= $2
          AND COALESCE(rs.active_backlogs, 0) <= $3
          AND COALESCE(att.avg_percentage, 100) >= $4
        GROUP BY s.id, s.usn, s.full_name, s.email, s.phone, s.current_semester, d.code, rs.cgpa, rs.active_backlogs, att.avg_percentage
        ORDER BY rs.cgpa DESC, s.usn ASC
      `;

      const result = await query(sql, [institutionId, Number(minCgpa), Number(maxBacklogs), Number(minAttendance)]);
      res.json(result.rows);
    } catch (err) {
      console.error('Failed to get eligible students:', err);
      res.status(500).json({ error: 'Failed to retrieve eligible students.' });
    }
  }
);

// POST /api/development/goals - Add goal
router.post('/goals', async (req: Request, res: Response) => {
  try {
    const { studentId, title, targetDate } = req.body;

    const result = await query(
      `INSERT INTO student_goals (student_id, title, target_date, status, progress_percentage)
       VALUES ($1, $2, $3, 'IN_PROGRESS', 0)
       RETURNING *`,
      [studentId, title, targetDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create student goal.' });
  }
});

// PUT /api/development/goals/:id - Update goal progress
router.put('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, progressPercentage } = req.body;

    const result = await query(
      `UPDATE student_goals
       SET status = COALESCE($1, status),
           progress_percentage = COALESCE($2, progress_percentage)
       WHERE id = $3
       RETURNING *`,
      [status, progressPercentage, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal progress.' });
  }
});

// POST /api/development/certificates/verify - Verify student certificate
router.post(
  '/certificates/:id/verify',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR', 'PLACEMENT_OFFICER']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { verified } = req.body;

      const result = await query(
        `UPDATE certificates SET verified = $1 WHERE id = $2 RETURNING *`,
        [verified !== false, id]
      );

      res.json({ message: 'Certificate verification status updated.', certificate: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Failed to verify certificate.' });
    }
  }
);

// POST /api/development/internships - Add internship record
router.post('/internships', async (req: Request, res: Response) => {
  try {
    const { studentId, companyName, role, startDate, endDate, stipendAmount, status } = req.body;

    const result = await query(
      `INSERT INTO internships (student_id, company_name, role, start_date, end_date, stipend_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [studentId, companyName, role, startDate, endDate || null, stipendAmount || null, status || 'COMPLETED']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record internship.' });
  }
});

export default router;
