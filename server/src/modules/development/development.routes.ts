import { Router, Request, Response } from 'express';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/development/student/:studentId
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const [goals, certs, internships] = await Promise.all([
      query(`SELECT * FROM student_goals WHERE student_id = $1 ORDER BY created_at DESC`, [studentId]),
      query(`SELECT * FROM certificates WHERE student_id = $1 ORDER BY issue_date DESC`, [studentId]),
      query(`SELECT * FROM internships WHERE student_id = $1 ORDER BY start_date DESC`, [studentId]),
    ]);

    res.json({
      goals: goals.rows,
      certificates: certs.rows,
      internships: internships.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve development records.' });
  }
});

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

export default router;
