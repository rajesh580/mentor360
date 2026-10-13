import { Router, Request, Response } from 'express';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/interventions - List all issues/concerns
router.get('/', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;
    const { status, severity } = req.query;

    let sql = `
      SELECT si.*, s.usn, s.full_name as student_name, s.current_semester,
             u.full_name as raised_by_name,
             COUNT(ap.id) as total_action_plans,
             COUNT(ap.id) FILTER (WHERE ap.status = 'COMPLETED') as completed_action_plans
      FROM student_issues si
      JOIN students s ON si.student_id = s.id
      JOIN users u ON si.raised_by = u.id
      LEFT JOIN action_plans ap ON si.id = ap.issue_id
      WHERE si.institution_id = $1
    `;
    const params: any[] = [institutionId];

    if (status) {
      params.push(status);
      sql += ` AND si.status = $${params.length}`;
    }

    if (severity) {
      params.push(severity);
      sql += ` AND si.severity = $${params.length}`;
    }

    sql += ` GROUP BY si.id, s.usn, s.full_name, s.current_semester, u.full_name ORDER BY si.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve student concerns.' });
  }
});

// POST /api/interventions - Report a new student concern/issue
router.post('/', requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR', 'COUNSELLOR']), async (req: Request, res: Response) => {
  try {
    const { studentId, category, severity, title, description } = req.body;
    const institutionId = req.tenantId;
    const raisedBy = req.user!.id;

    if (!studentId || !title || !description) {
      return res.status(400).json({ error: 'studentId, title, and description are required.' });
    }

    const result = await query(
      `INSERT INTO student_issues (
         institution_id, student_id, raised_by, category, severity, title, description, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')
       RETURNING *`,
      [institutionId, studentId, raisedBy, category || 'ACADEMIC', severity || 'MEDIUM', title, description]
    );

    res.status(201).json({ message: 'Concern recorded successfully', issue: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record student concern.' });
  }
});

// POST /api/interventions/:id/action-plans - Add action plan
router.post('/:id/action-plans', requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROCTOR']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, objective, targetDate, assignedTo } = req.body;

    const result = await query(
      `INSERT INTO action_plans (issue_id, title, objective, assigned_to, target_date, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING *`,
      [id, title, objective, assignedTo || req.user!.id, targetDate]
    );

    res.status(201).json({ message: 'Action plan created', actionPlan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create action plan.' });
  }
});

export default router;
