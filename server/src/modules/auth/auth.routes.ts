import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '../../config/db.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userRes = await query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.role_code, u.institution_id, u.status,
              i.name as institution_name, i.code as institution_code
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account is suspended or inactive.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(503).json({ error: 'Authentication is not configured on this server.' });
    }
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        roleCode: user.role_code,
        institutionId: user.institution_id,
      },
      secret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'] }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        roleCode: user.role_code,
        institutionId: user.institution_id,
        institutionName: user.institution_name,
        institutionCode: user.institution_code,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.email, u.full_name, u.role_code, u.phone, u.institution_id,
              i.name as institution_name, i.code as institution_code,
              f.id as faculty_id, f.designation,
              s.id as student_id, s.usn, s.current_semester, s.current_section
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       LEFT JOIN faculty f ON u.id = f.user_id
       LEFT JOIN students s ON u.id = s.user_id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: userRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user profile.' });
  }
});

export default router;
