import { Router, Request, Response } from 'express';
import { query, getClient } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware, requireRoles } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// Strict ACL: Only COUNSELLOR and SUPER_ADMIN
router.use(requireRoles(['SUPER_ADMIN', 'COUNSELLOR']));

// GET /api/counselling/sessions - List counselling sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const institutionId = req.tenantId;

    const result = await query(
      `SELECT cs.*, s.usn, s.full_name as student_name, u.full_name as counsellor_name
       FROM counselling_sessions cs
       JOIN students s ON cs.student_id = s.id
       JOIN users u ON cs.counsellor_id = u.id
       WHERE cs.institution_id = $1
       ORDER BY cs.session_date DESC`,
      [institutionId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve counselling sessions.' });
  }
});

// GET /api/counselling/sessions/:id - Get session notes and log access
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const sessionRes = await query(
      `SELECT cs.*, cn.encrypted_note, cn.risk_level, s.usn, s.full_name as student_name
       FROM counselling_sessions cs
       JOIN students s ON cs.student_id = s.id
       LEFT JOIN confidential_notes cn ON cs.id = cn.session_id
       WHERE cs.id = $1`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Strict audit log for confidential record access
    await query(
      `INSERT INTO counselling_access_logs (session_id, accessed_by, reason)
       VALUES ($1, $2, 'Clinical view requested by authorized counsellor')`,
      [id, userId]
    );

    res.json(sessionRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve confidential note.' });
  }
});

// POST /api/counselling/sessions - Record new counselling session
router.post('/sessions', async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { studentId, sessionDate, referralSource, note, riskLevel } = req.body;
    const institutionId = req.tenantId;
    const counsellorId = req.user!.id;

    await client.query('BEGIN');

    const sRes = await client.query(
      `INSERT INTO counselling_sessions (institution_id, student_id, counsellor_id, session_date, referral_source, general_status)
       VALUES ($1, $2, $3, $4, $5, 'ONGOING')
       RETURNING id`,
      [institutionId, studentId, counsellorId, sessionDate || new Date(), referralSource || 'Proctor Referral']
    );

    const sessionId = sRes.rows[0].id;

    if (note) {
      await client.query(
        `INSERT INTO confidential_notes (session_id, encrypted_note, risk_level)
         VALUES ($1, $2, $3)`,
        [sessionId, note, riskLevel || 'NORMAL']
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Confidential session logged successfully.', sessionId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to log counselling session.' });
  } finally {
    client.release();
  }
});

export default router;
