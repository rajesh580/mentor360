import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRoles, tenantMiddleware } from '../../middlewares/tenant.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/institutions', requireRoles(['SUPER_ADMIN']), async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, code, name FROM institutions WHERE status = $1 ORDER BY name', ['ACTIVE']);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve institutions.' });
  }
});

router.use(tenantMiddleware, requireRoles(['SUPER_ADMIN', 'INSTITUTION_ADMIN']));

router.get('/', async (req: Request, res: Response) => {
  if (!req.tenantId) return res.status(400).json({ error: 'Select an institution to manage its users.' });
  try {
    const result = await query(
      `SELECT id, email, full_name, phone, role_code, status, created_at
       FROM users WHERE institution_id = $1 ORDER BY full_name`,
      [req.tenantId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { fullName, email, password, roleCode, phone } = req.body || {};
  const institutionId = req.tenantId;

  if (!institutionId) return res.status(400).json({ error: 'Select an institution before adding a user.' });
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 255) {
    return res.status(400).json({ error: 'Enter a name between 2 and 255 characters.' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return res.status(400).json({ error: 'Set a temporary password between 12 and 128 characters.' });
  }
  if (typeof roleCode !== 'string') return res.status(400).json({ error: 'Select a user role.' });

  if (req.user?.roleCode === 'INSTITUTION_ADMIN' && ['SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'INSTITUTION_ADMIN'].includes(roleCode)) {
    return res.status(403).json({ error: 'Institution administrators cannot create administrator accounts at the same or higher level.' });
  }

  try {
    const roleResult = await query('SELECT code FROM roles WHERE code = $1', [roleCode]);
    if (!roleResult.rows.length) return res.status(400).json({ error: 'The selected role is not available.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (institution_id, email, password_hash, full_name, phone, role_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
       RETURNING id, email, full_name, phone, role_code, status, created_at`,
      [institutionId, email.trim().toLowerCase(), passwordHash, fullName.trim(), typeof phone === 'string' ? phone.trim() || null : null, roleCode]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' });
    console.error('Failed to create user:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

export default router;
