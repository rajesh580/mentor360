import { Router, Request, Response } from 'express';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate, tenantMiddleware);

// GET /api/communication/parent-logs/:studentId - List communication records
router.get('/parent-logs/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const result = await query(
      `SELECT pc.*, g.name as guardian_name, g.phone as guardian_phone, u.full_name as sent_by_name
       FROM parent_communications pc
       JOIN guardians g ON pc.guardian_id = g.id
       JOIN users u ON pc.initiated_by = u.id
       WHERE pc.student_id = $1
       ORDER BY pc.sent_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve communication logs.' });
  }
});

// POST /api/communication/send - Record or dispatch parent message
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { studentId, guardianId, channel, subject, message } = req.body;
    const institutionId = req.tenantId;
    const userId = req.user!.id;

    const result = await query(
      `INSERT INTO parent_communications (
         institution_id, student_id, guardian_id, initiated_by, channel, subject, message, delivery_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SENT')
       RETURNING *`,
      [institutionId, studentId, guardianId, userId, channel || 'SMS', subject, message]
    );

    res.status(201).json({ message: 'Communication logged & dispatched', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log parent communication.' });
  }
});

// GET /api/communication/notifications - Get current user notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

export default router;
