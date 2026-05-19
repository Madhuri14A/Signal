import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  niche: string | null;
  created_at: string;
};

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  email: z.string().trim().email('email must be valid'),
  password: z.string().min(8, 'password must be at least 8 characters'),
  niche: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email('email must be valid'),
  password: z.string().min(8, 'password must be at least 8 characters'),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }

  return secret;
}

function signToken(user: Pick<UserRow, 'id' | 'email'>): string {
  return jwt.sign(
    {
      email: user.email,
    },
    getJwtSecret(),
    {
      subject: String(user.id),
      expiresIn: '7d',
    }
  );
}

router.post('/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      issues: parsed.error.issues,
    });
  }

  const { name, email, password, niche } = parsed.data;

  try {
    const existing = await query<{ id: number }>('SELECT id FROM users WHERE email = $1', [email]);
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query<UserRow>(
      `INSERT INTO users (name, email, password_hash, niche)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, password_hash, niche, created_at`,
      [name, email, passwordHash, niche ?? null]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        niche: user.niche,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to register user',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

router.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      issues: parsed.error.issues,
    });
  }

  const { email, password } = parsed.data;

  try {
    const result = await query<UserRow>(
      'SELECT id, name, email, password_hash, niche, created_at FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        niche: user.niche,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to login',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

router.get('/auth/me', authMiddleware, async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const result = await query<Omit<UserRow, 'password_hash'>>(
      `SELECT id, name, email, niche, created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch user',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

router.put('/user/niche', authMiddleware, async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { niche } = req.body as { niche?: string };
  if (!niche || !niche.trim()) {
    return res.status(400).json({ message: 'niche is required' });
  }

  try {
    const result = await query<{ id: number; niche: string | null }>(
      `UPDATE users
       SET niche = $2
       WHERE id = $1
       RETURNING id, niche`,
      [req.user.id, niche.trim()]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'Niche updated', user });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update niche',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

export default router;
