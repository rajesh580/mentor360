import { Router, Request, Response } from 'express';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';
import { cacheService, cacheMiddleware } from '../../services/cache.service.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/proctors/workload - Faculty mentoring workload summary with cache
router.get('/workload', cacheMiddleware(30, ['proctors']), async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const sql = `
      SELECT f.id as faculty_id, f.employee_id, f.designation, f.max_mentees,
             u.full_name as faculty_name, u.email as faculty_email,
             d.code as department_code, d.name as department_name,
             COUNT(pa.id) FILTER (WHERE pa.status = 'ACTIVE') as active_mentees_count
      FROM faculty f
      JOIN users u ON f.user_id = u.id
      JOIN departments d ON f.department_id = d.id
      LEFT JOIN proctor_allocations pa ON f.id = pa.faculty_id
      WHERE f.institution_id = $1
      GROUP BY f.id, f.employee_id, f.designation, f.max_mentees, u.full_name, u.email, d.code, d.name
      ORDER BY u.full_name ASC
    `;

    const result = await query(sql, [institutionId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to get proctor workload:', err);
    res.status(500).json({ error: 'Failed to retrieve proctor workload.' });
  }
});

// GET /api/proctors/allocations - List all current student-mentor allocations
router.get('/allocations', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;
    const { departmentId, facultyId, semester, status = 'ACTIVE' } = req.query;

    let sql = `
      SELECT pa.id as allocation_id, pa.status, pa.allocated_date, pa.effective_from, pa.semester_number,
             s.id as student_id, s.usn, s.full_name as student_name, s.current_semester, s.current_section,
             d.code as department_code,
             f.id as faculty_id, f.employee_id, f.designation,
             u_f.full_name as mentor_name, u_f.email as mentor_email
      FROM proctor_allocations pa
      JOIN students s ON pa.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN faculty f ON pa.faculty_id = f.id
      JOIN users u_f ON f.user_id = u_f.id
      WHERE pa.institution_id = $1
    `;
    const params: any[] = [institutionId];

    if (status) {
      params.push(status);
      sql += ` AND pa.status = $${params.length}`;
    }
    if (departmentId) {
      params.push(departmentId);
      sql += ` AND s.department_id = $${params.length}`;
    }
    if (facultyId) {
      params.push(facultyId);
      sql += ` AND pa.faculty_id = $${params.length}`;
    }
    if (semester) {
      params.push(Number(semester));
      sql += ` AND pa.semester_number = $${params.length}`;
    }

    sql += ` ORDER BY s.usn ASC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to get allocations:', err);
    res.status(500).json({ error: 'Failed to retrieve proctor allocations.' });
  }
});

// GET /api/proctors/unallocated - Get students without active mentor assignment
router.get('/unallocated', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;
    const { departmentId, semester } = req.query;

    let sql = `
      SELECT s.id, s.usn, s.full_name, s.email, s.current_semester, s.current_section,
             d.code as department_code, d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN proctor_allocations pa ON s.id = pa.student_id AND pa.status = 'ACTIVE'
      WHERE s.institution_id = $1 AND pa.id IS NULL
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

    sql += ` ORDER BY s.usn ASC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to get unallocated students:', err);
    res.status(500).json({ error: 'Failed to retrieve unallocated students.' });
  }
});

// POST /api/proctors/bulk-allocate - Bulk assign multiple students to a mentor
router.post(
  '/bulk-allocate',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR_COORDINATOR']),
  async (req: Request, res: Response) => {
    const client = await getClient();
    try {
      const { studentIds, facultyId, academicYearId } = req.body;
      const institutionId = req.tenantId;
      const userId = req.user!.id;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !facultyId) {
        return res.status(400).json({ error: 'studentIds array and facultyId are required.' });
      }

      await client.query('BEGIN');

      // Fetch active academic year if not provided
      let ayId = academicYearId;
      if (!ayId) {
        const ayRes = await client.query(
          `SELECT id FROM academic_years WHERE institution_id = $1 AND is_current = true LIMIT 1`,
          [institutionId]
        );
        ayId = ayRes.rows[0]?.id;
      }

      let count = 0;
      for (const studentId of studentIds) {
        // Find student semester
        const stuRes = await client.query(`SELECT current_semester FROM students WHERE id = $1`, [studentId]);
        const sem = stuRes.rows[0]?.current_semester || 1;

        // End any previous active allocation
        await client.query(
          `UPDATE proctor_allocations SET status = 'TRANSFERRED', effective_to = CURRENT_DATE 
           WHERE student_id = $1 AND status = 'ACTIVE'`,
          [studentId]
        );

        // Insert new active allocation
        await client.query(
          `INSERT INTO proctor_allocations (
             institution_id, student_id, faculty_id, academic_year_id, semester_number, status, allocated_date, effective_from, allocated_by
           )
           VALUES ($1, $2, $3, $4, $5, 'ACTIVE', CURRENT_DATE, CURRENT_DATE, $6)`,
          [institutionId, studentId, facultyId, ayId, sem, userId]
        );
        count++;
      }

      await client.query('COMMIT');
      cacheService.invalidateTags(['proctors', 'reports']);

      res.json({ message: `Successfully allocated ${count} students to faculty.`, allocatedCount: count });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Bulk allocation error:', err);
      res.status(500).json({ error: 'Failed to process bulk allocation.' });
    } finally {
      client.release();
    }
  }
);

// POST /api/proctors/reassign - Transfer student to a new mentor with historical trail
router.post(
  '/reassign',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR_COORDINATOR']),
  async (req: Request, res: Response) => {
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

      // If no academic year found yet, fallback to current
      if (!ayId) {
        const ayRes = await client.query(
          `SELECT id FROM academic_years WHERE institution_id = $1 AND is_current = true LIMIT 1`,
          [institutionId]
        );
        ayId = ayRes.rows[0]?.id;
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
      cacheService.invalidateTags(['proctors', 'reports']);

      res.json({ message: 'Proctor reassignment successfully processed.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error reassigning proctor:', err);
      res.status(500).json({ error: 'Failed to process proctor reassignment.' });
    } finally {
      client.release();
    }
  }
);

// GET /api/proctors/reassignment-history - Complete audit trail of mentor transfers
router.get('/reassignment-history', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const sql = `
      SELECT pr.*, 
             s.usn, s.full_name as student_name,
             u_prev.full_name as previous_mentor_name, f_prev.employee_id as previous_emp_id,
             u_new.full_name as new_mentor_name, f_new.employee_id as new_emp_id,
             u_appr.full_name as approved_by_name
      FROM proctor_reassignments pr
      JOIN students s ON pr.student_id = s.id
      JOIN faculty f_prev ON pr.previous_faculty_id = f_prev.id
      JOIN users u_prev ON f_prev.user_id = u_prev.id
      JOIN faculty f_new ON pr.new_faculty_id = f_new.id
      JOIN users u_new ON f_new.user_id = u_new.id
      LEFT JOIN users u_appr ON pr.approved_by = u_appr.id
      WHERE pr.institution_id = $1
      ORDER BY pr.reassignment_date DESC, pr.created_at DESC
    `;

    const result = await query(sql, [institutionId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to retrieve reassignment history:', err);
    res.status(500).json({ error: 'Failed to retrieve reassignment history.' });
  }
});

export default router;
