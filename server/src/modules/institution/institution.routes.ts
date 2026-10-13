import { Router, Request, Response } from 'express';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/institution/summary
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

// GET /api/institution/departments
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const depts = await query(`SELECT * FROM departments WHERE institution_id = $1 ORDER BY code`, [req.tenantId]);
    res.json(depts.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments.' });
  }
});

export default router;
