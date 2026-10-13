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

export default router;
