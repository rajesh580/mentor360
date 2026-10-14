import { Router, Request, Response } from 'express';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';
import { logAudit } from '../../middlewares/audit.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/institution/summary - High level institution summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const [instRes, ayRes, deptsRes, progsRes] = await Promise.all([
      query(`SELECT id, code, name, slug, status, settings FROM institutions WHERE id = $1`, [institutionId]),
      query(`SELECT id, name, start_date, end_date, is_current FROM academic_years WHERE institution_id = $1 ORDER BY start_date DESC`, [institutionId]),
      query(`SELECT id, code, name FROM departments WHERE institution_id = $1 ORDER BY code`, [institutionId]),
      query(`SELECT id, department_id, code, name, degree_level, total_semesters FROM programmes WHERE institution_id = $1`, [institutionId]),
    ]);

    res.json({
      institution: instRes.rows[0],
      academicYears: ayRes.rows,
      departments: deptsRes.rows,
      programmes: progsRes.rows,
    });
  } catch (err) {
    console.error('Failed to get institution structure:', err);
    res.status(500).json({ error: 'Failed to retrieve institution details.' });
  }
});

// GET /api/institution/structure - Complete hierarchical tree
router.get('/structure', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const [instRes, ayRes, deptsRes, progsRes, batchesRes, sectionsRes] = await Promise.all([
      query(`SELECT id, code, name, slug, status, settings FROM institutions WHERE id = $1`, [institutionId]),
      query(`SELECT * FROM academic_years WHERE institution_id = $1 ORDER BY start_date DESC`, [institutionId]),
      query(`SELECT * FROM departments WHERE institution_id = $1 ORDER BY code`, [institutionId]),
      query(`SELECT p.*, d.code as department_code, d.name as department_name FROM programmes p JOIN departments d ON p.department_id = d.id WHERE p.institution_id = $1 ORDER BY p.code`, [institutionId]),
      query(`SELECT b.*, p.name as programme_name FROM batches b JOIN programmes p ON b.programme_id = p.id WHERE b.institution_id = $1 ORDER BY b.admission_year DESC`, [institutionId]),
      query(`SELECT s.*, p.code as programme_code FROM sections s JOIN programmes p ON s.programme_id = p.id WHERE s.institution_id = $1 ORDER BY s.semester_number, s.name`, [institutionId]),
    ]);

    res.json({
      institution: instRes.rows[0],
      academicYears: ayRes.rows,
      departments: deptsRes.rows,
      programmes: progsRes.rows,
      batches: batchesRes.rows,
      sections: sectionsRes.rows,
    });
  } catch (err) {
    console.error('Failed to get full institution structure:', err);
    res.status(500).json({ error: 'Failed to retrieve institution structure.' });
  }
});

// GET /api/institution/departments
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const depts = await query(`SELECT * FROM departments WHERE institution_id = $1 ORDER BY code`, [req.tenantId]);
    res.json(depts.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments.' });
  }
});

// POST /api/institution/departments - Create new Department
router.post(
  '/departments',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN']),
  logAudit('CREATE_DEPARTMENT', 'DEPARTMENT'),
  async (req: Request, res: Response) => {
    try {
      const { code, name } = req.body;
      const institutionId = req.tenantId;

      if (!code || !name) {
        return res.status(400).json({ error: 'Department code and name are required.' });
      }

      const result = await query(
        `INSERT INTO departments (institution_id, code, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING *`,
        [institutionId, code.trim().toUpperCase(), name.trim()]
      );

      res.status(201).json({ message: 'Department successfully created/updated.', department: result.rows[0] });
    } catch (err: any) {
      console.error('Error creating department:', err);
      res.status(500).json({ error: 'Failed to create department.' });
    }
  }
);

// POST /api/institution/programmes - Create new Programme
router.post(
  '/programmes',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN']),
  logAudit('CREATE_PROGRAMME', 'PROGRAMME'),
  async (req: Request, res: Response) => {
    try {
      const { departmentId, code, name, degreeLevel, totalSemesters } = req.body;
      const institutionId = req.tenantId;

      if (!departmentId || !code || !name) {
        return res.status(400).json({ error: 'Department, code, and name are required.' });
      }

      const result = await query(
        `INSERT INTO programmes (institution_id, department_id, code, name, degree_level, total_semesters)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name, total_semesters = EXCLUDED.total_semesters
         RETURNING *`,
        [
          institutionId,
          departmentId,
          code.trim().toUpperCase(),
          name.trim(),
          degreeLevel || 'UG',
          totalSemesters || 8,
        ]
      );

      res.status(201).json({ message: 'Programme successfully created/updated.', programme: result.rows[0] });
    } catch (err: any) {
      console.error('Error creating programme:', err);
      res.status(500).json({ error: 'Failed to create programme.' });
    }
  }
);

// POST /api/institution/batches - Create new Batch
router.post(
  '/batches',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN']),
  logAudit('CREATE_BATCH', 'BATCH'),
  async (req: Request, res: Response) => {
    try {
      const { programmeId, name, admissionYear, graduationYear } = req.body;
      const institutionId = req.tenantId;

      if (!programmeId || !name || !admissionYear || !graduationYear) {
        return res.status(400).json({ error: 'Programme, batch name, admission year, and graduation year are required.' });
      }

      const result = await query(
        `INSERT INTO batches (institution_id, programme_id, name, admission_year, graduation_year)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [institutionId, programmeId, name.trim(), Number(admissionYear), Number(graduationYear)]
      );

      res.status(201).json({ message: 'Batch successfully created.', batch: result.rows[0] });
    } catch (err: any) {
      console.error('Error creating batch:', err);
      res.status(500).json({ error: 'Failed to create batch.' });
    }
  }
);

// POST /api/institution/academic-years - Add Academic Year
router.post(
  '/academic-years',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN']),
  logAudit('CREATE_ACADEMIC_YEAR', 'ACADEMIC_YEAR'),
  async (req: Request, res: Response) => {
    const client = await getClient();
    try {
      const { name, startDate, endDate, isCurrent } = req.body;
      const institutionId = req.tenantId;

      if (!name || !startDate || !endDate) {
        return res.status(400).json({ error: 'Academic year name, start date, and end date are required.' });
      }

      await client.query('BEGIN');

      if (isCurrent) {
        await client.query(
          `UPDATE academic_years SET is_current = false WHERE institution_id = $1`,
          [institutionId]
        );
      }

      const result = await client.query(
        `INSERT INTO academic_years (institution_id, name, start_date, end_date, is_current)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (institution_id, name) DO UPDATE SET is_current = EXCLUDED.is_current, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date
         RETURNING *`,
        [institutionId, name.trim(), startDate, endDate, Boolean(isCurrent)]
      );

      await client.query('COMMIT');
      res.status(201).json({ message: 'Academic Year updated.', academicYear: result.rows[0] });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Error creating academic year:', err);
      res.status(500).json({ error: 'Failed to create academic year.' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/institution/settings - Update Institutional Settings & Telemetry
router.put(
  '/settings',
  requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN']),
  logAudit('UPDATE_SETTINGS', 'INSTITUTION'),
  async (req: Request, res: Response) => {
    try {
      const institutionId = req.tenantId;
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings payload.' });
      }

      const result = await query(
        `UPDATE institutions
         SET settings = settings || $1::jsonb, updated_at = NOW()
         WHERE id = $2
         RETURNING id, code, name, settings`,
        [JSON.stringify(settings), institutionId]
      );

      res.json({ message: 'Institution settings saved successfully.', institution: result.rows[0] });
    } catch (err) {
      console.error('Error updating settings:', err);
      res.status(500).json({ error: 'Failed to update settings.' });
    }
  }
);

// GET /api/institution/tenants - Multi-Tenant SaaS platform directory (Super Admin)
router.get(
  '/tenants',
  requireRoles(['SUPER_ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      const sql = `
        SELECT i.id, i.code, i.name, i.slug, i.status, i.settings, i.created_at,
               COUNT(DISTINCT s.id) as student_count,
               COUNT(DISTINCT f.id) as faculty_count,
               COUNT(DISTINCT u.id) as user_count
        FROM institutions i
        LEFT JOIN students s ON i.id = s.institution_id
        LEFT JOIN faculty f ON i.id = f.institution_id
        LEFT JOIN users u ON i.id = u.institution_id
        GROUP BY i.id, i.code, i.name, i.slug, i.status, i.settings, i.created_at
        ORDER BY i.name ASC
      `;
      const result = await query(sql);
      res.json(result.rows);
    } catch (err) {
      console.error('Failed to get tenants:', err);
      res.status(500).json({ error: 'Failed to retrieve SaaS institutions.' });
    }
  }
);

// POST /api/institution/tenants - Provision new SaaS tenant institution (Super Admin)
router.post(
  '/tenants',
  requireRoles(['SUPER_ADMIN']),
  logAudit('PROVISION_TENANT', 'INSTITUTION'),
  async (req: Request, res: Response) => {
    const client = await getClient();
    try {
      const { code, name, slug, maxStudents, adminEmail, adminName, adminPassword, university } = req.body;

      if (!code || !name || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'Institution code, name, admin email, and admin password are required.' });
      }

      await client.query('BEGIN');

      const institutionSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
      const settings = JSON.stringify({
        university: university || 'VTU',
        tier: 'ENTERPRISE',
        maxStudents: Number(maxStudents) || 3000,
      });

      // 1. Insert Institution
      const instRes = await client.query(
        `INSERT INTO institutions (code, name, slug, status, settings)
         VALUES ($1, $2, $3, 'ACTIVE', $4::jsonb)
         RETURNING *`,
        [code.trim().toUpperCase(), name.trim(), institutionSlug, settings]
      );
      const newInst = instRes.rows[0];

      // 2. Insert Default Academic Year
      const currentYear = new Date().getFullYear();
      await client.query(
        `INSERT INTO academic_years (institution_id, name, start_date, end_date, is_current)
         VALUES ($1, $2, $3, $4, true)`,
        [newInst.id, `${currentYear}-${currentYear + 1}`, `${currentYear}-08-01`, `${currentYear + 1}-06-30`]
      );

      // 3. Create Institution Admin User
      const bcrypt = (await import('bcryptjs')).default;
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const adminUserRes = await client.query(
        `INSERT INTO users (institution_id, email, password_hash, full_name, role_code, status)
         VALUES ($1, $2, $3, $4, 'INSTITUTION_ADMIN', 'ACTIVE')
         RETURNING id, email, full_name, role_code`,
        [newInst.id, adminEmail.trim().toLowerCase(), passwordHash, (adminName || 'Institution Administrator').trim()]
      );

      await client.query('COMMIT');
      res.status(201).json({
        message: 'New SaaS institution and administrator account provisioned successfully.',
        institution: newInst,
        adminUser: adminUserRes.rows[0],
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: 'An institution with that code or slug, or a user with that email already exists.' });
      }
      console.error('Failed to provision tenant:', err);
      res.status(500).json({ error: 'Failed to provision new institution.' });
    } finally {
      client.release();
    }
  }
);

// PATCH /api/institution/tenants/:id/status - Activate / Suspend / Trial tenant (Super Admin)
router.patch(
  '/tenants/:id/status',
  requireRoles(['SUPER_ADMIN']),
  logAudit('UPDATE_TENANT_STATUS', 'INSTITUTION'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['ACTIVE', 'SUSPENDED', 'TRIAL'].includes(status)) {
        return res.status(400).json({ error: 'Status must be ACTIVE, SUSPENDED, or TRIAL.' });
      }

      const result = await query(
        `UPDATE institutions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, code, name, status`,
        [status, id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Institution not found.' });
      }

      res.json({ message: `Tenant status updated to ${status}.`, institution: result.rows[0] });
    } catch (err) {
      console.error('Failed to update tenant status:', err);
      res.status(500).json({ error: 'Failed to update tenant status.' });
    }
  }
);

// GET /api/institution/university-summary - University-wide analytics for affiliated colleges
router.get(
  '/university-summary',
  requireRoles(['SUPER_ADMIN', 'UNIVERSITY_ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      const sql = `
        SELECT i.id, i.code, i.name, i.status,
               COUNT(DISTINCT s.id) as student_count,
               COUNT(DISTINCT f.id) as faculty_count,
               ROUND(AVG(rs.sgpa)::numeric, 2) as avg_sgpa,
               COUNT(DISTINCT CASE WHEN ar.is_shortage = true THEN s.id END) as shortage_students,
               COUNT(DISTINCT mm.id) as total_meetings
        FROM institutions i
        LEFT JOIN students s ON i.id = s.institution_id
        LEFT JOIN faculty f ON i.id = f.institution_id
        LEFT JOIN result_summaries rs ON s.id = rs.student_id
        LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.is_shortage = true
        LEFT JOIN mentoring_meetings mm ON i.id = mm.institution_id
        GROUP BY i.id, i.code, i.name, i.status
        ORDER BY i.name ASC
      `;
      const result = await query(sql);

      // Aggregate totals
      let totalStudents = 0;
      let totalFaculty = 0;
      let totalShortages = 0;
      let totalMeetings = 0;

      result.rows.forEach((r) => {
        totalStudents += parseInt(r.student_count) || 0;
        totalFaculty += parseInt(r.faculty_count) || 0;
        totalShortages += parseInt(r.shortage_students) || 0;
        totalMeetings += parseInt(r.total_meetings) || 0;
      });

      res.json({
        institutions: result.rows,
        universityTotals: {
          totalAffiliatedInstitutions: result.rows.length,
          totalStudents,
          totalFaculty,
          totalShortages,
          totalMeetings,
          averageMenteeRatio: totalFaculty > 0 ? `1:${(totalStudents / totalFaculty).toFixed(1)}` : 'N/A',
        },
      });
    } catch (err) {
      console.error('Failed to get university summary:', err);
      res.status(500).json({ error: 'Failed to retrieve university-level summary.' });
    }
  }
);

export default router;
