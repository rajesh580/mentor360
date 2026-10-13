import { Router, Request, Response } from 'express';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/proctors/workload - Faculty mentoring workload summary
router.get('/workload', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const sql = `
      SELECT f.id as faculty_id, f.employee_id, f.designation, f.max_mentees,
             u.full_name as faculty_name, u.email as faculty_email,
             d.code as department_code,
             COUNT(pa.id) FILTER (WHERE pa.status = 'ACTIVE') as active_mentees_count
      FROM faculty f
      JOIN users u ON f.user_id = u.id
      JOIN departments d ON f.department_id = d.id
      LEFT JOIN proctor_allocations pa ON f.id = pa.faculty_id
      WHERE f.institution_id = $1
      GROUP BY f.id, f.employee_id, f.designation, f.max_mentees, u.full_name, u.email, d.code
      ORDER BY u.full_name ASC
    `;

    const result = await query(sql, [institutionId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to get proctor workload:', err);
    res.status(500).json({ error: 'Failed to retrieve proctor workload.' });
  }
});

// POST /api/proctors/reassign - Transfer student to a new mentor with historical trail
router.post('/reassign', requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR_COORDINATOR']), async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { studentId, newFacultyId, reason, academicYearId } = req.body;
    const institutionId = req.tenantId;
    const userId = req.user!.id;

    if (!studentId || !newFacultyId || !reason) {
      return res.status(400).json({ error: 'studentId, newFacultyId, and reason are required.' });
    }

    await client.query('BEGIN');

    // 1. Get current active allocation
    const curAllocRes = await client.query(
      `SELECT * FROM proctor_allocations 
       WHERE student_id = $1 AND institution_id = $2 AND status = 'ACTIVE'`,
      [studentId, institutionId]
    );

    let previousFacultyId = null;
    let semesterNumber = 1;
    let ayId = academicYearId;

    if (curAllocRes.rows.length > 0) {
      const curAlloc = curAllocRes.rows[0];
      previousFacultyId = curAlloc.faculty_id;
      semesterNumber = curAlloc.semester_number;
      if (!ayId) ayId = curAlloc.academic_year_id;

      // Mark old allocation as TRANSFERRED
      await client.query(
        `UPDATE proctor_allocations 
         SET status = 'TRANSFERRED', effective_to = CURRENT_DATE 
         WHERE id = $1`,
        [curAlloc.id]
      );
    }

    // 2. Create new active allocation
    await client.query(
      `INSERT INTO proctor_allocations (
         institution_id, student_id, faculty_id, academic_year_id, semester_number, status, allocated_date, effective_from, allocated_by
       )
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', CURRENT_DATE, CURRENT_DATE, $6)`,
      [institutionId, studentId, newFacultyId, ayId, semesterNumber, userId]
    );

    // 3. Record historical reassignment audit entry
    if (previousFacultyId) {
      await client.query(
        `INSERT INTO proctor_reassignments (
           institution_id, student_id, previous_faculty_id, new_faculty_id, academic_year_id, reassignment_date, reason, approved_by
         )
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7)`,
        [institutionId, studentId, previousFacultyId, newFacultyId, ayId, reason, userId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Proctor reassignment successfully processed.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error reassigning proctor:', err);
    res.status(500).json({ error: 'Failed to process proctor reassignment.' });
  } finally {
    client.release();
  }
});

export default router;
