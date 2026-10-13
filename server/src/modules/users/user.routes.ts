import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRoles, tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { logAudit } from '../../middlewares/audit.middleware.js';

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

// GET /api/users - List users with optional role and status filters
router.get('/', async (req: Request, res: Response) => {
  if (!req.tenantId) return res.status(400).json({ error: 'Select an institution to manage its users.' });
  try {
    const { role, status, search } = req.query;
    let sql = `
      SELECT u.id, u.email, u.full_name, u.phone, u.role_code, u.status, u.created_at, u.last_login
      FROM users u
      WHERE u.institution_id = $1
    `;
    const params: any[] = [req.tenantId];

    if (role) {
      params.push(role);
      sql += ` AND u.role_code = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND u.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    sql += ` ORDER BY u.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// GET /api/users/audit-logs - View institutional audit logs
router.get('/audit-logs', async (req: Request, res: Response) => {
  if (!req.tenantId) return res.status(400).json({ error: 'Select an institution to view audit logs.' });
  try {
    const { action, limit = 50 } = req.query;
    let sql = `
      SELECT al.*, u.full_name as user_name, u.email as user_email, u.role_code as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.institution_id = $1
    `;
    const params: any[] = [req.tenantId];

    if (action) {
      params.push(action);
      sql += ` AND al.action = $${params.length}`;
    }

    sql += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit) || 50);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to retrieve audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// POST /api/users - Create new user account
router.post(
  '/',
  logAudit('CREATE_USER', 'USER'),
  async (req: Request, res: Response) => {
    const { fullName, email, password, roleCode, phone, departmentId, employeeId, designation } = req.body || {};
    const institutionId = req.tenantId;

    if (!institutionId) return res.status(400).json({ error: 'Select an institution before adding a user.' });
    if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 255) {
      return res.status(400).json({ error: 'Enter a name between 2 and 255 characters.' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Set a temporary password between 8 and 128 characters.' });
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

      const newUser = result.rows[0];

      // If user is a PROCTOR / HOD / DEAN and departmentId is supplied, also register faculty record
      if (['PROCTOR', 'HOD', 'DEAN', 'PROCTOR_COORDINATOR'].includes(roleCode) && departmentId) {
        const empId = employeeId || `EMP-${Date.now().toString().slice(-5)}`;
        await query(
          `INSERT INTO faculty (institution_id, user_id, department_id, employee_id, designation, max_mentees)
           VALUES ($1, $2, $3, $4, $5, 30)
           ON CONFLICT DO NOTHING`,
          [institutionId, newUser.id, departmentId, empId, designation || 'Assistant Professor']
        );
      }

      res.status(201).json({ user: newUser });
    } catch (error: any) {
      if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' });
      console.error('Failed to create user:', error);
      res.status(500).json({ error: 'Failed to create user.' });
    }
  }
);

// PATCH /api/users/:id/status - Toggle user status (ACTIVE / SUSPENDED / INACTIVE)
router.patch(
  '/:id/status',
  logAudit('UPDATE_USER_STATUS', 'USER'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const institutionId = req.tenantId;

      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED.' });
      }

      // Prevent self-suspension
      if (req.user?.id === id) {
        return res.status(400).json({ error: 'You cannot alter your own account status.' });
      }

      const result = await query(
        `UPDATE users
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND institution_id = $3
         RETURNING id, email, full_name, role_code, status`,
        [status, id, institutionId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'User not found in this institution.' });
      }

      res.json({ message: `User status changed to ${status}`, user: result.rows[0] });
    } catch (err) {
      console.error('Failed to update user status:', err);
      res.status(500).json({ error: 'Failed to update user status.' });
    }
  }
);

// POST /api/users/:id/reset-password - Reset password
router.post(
  '/:id/reset-password',
  logAudit('RESET_PASSWORD', 'USER'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const institutionId = req.tenantId;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      const result = await query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2 AND institution_id = $3
         RETURNING id, email, full_name`,
        [passwordHash, id, institutionId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'User not found.' });
      }

      res.json({ message: 'Password has been successfully updated.' });
    } catch (err) {
      console.error('Failed to reset password:', err);
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  }
);

export default router;
