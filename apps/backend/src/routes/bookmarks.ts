import { Router } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

type BookmarkRow = {
  id: number;
  user_id: number;
  signal_id: number;
  created_at: string;
};

type BookmarkedSignalRow = {
  id: number;
  label: string | null;
  summary: string | null;
  velocity: number;
  created_at: string;
  article_count: number;
  bookmarked_at: string;
};

const router = Router();

router.post('/bookmarks/:signalId', authMiddleware, async (req, res) => {
  const userId = req.user?.id;
  const signalId = Number(req.params.signalId);

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!Number.isInteger(signalId) || signalId <= 0) {
    return res.status(400).json({ message: 'invalid signal id' });
  }

  try {
    const signalExists = await query<{ id: number }>('SELECT id FROM signals WHERE id = $1 LIMIT 1', [
      signalId,
    ]);

    if ((signalExists.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'signal not found' });
    }

    const existing = await query<BookmarkRow>(
      'SELECT id, user_id, signal_id, created_at FROM bookmarks WHERE user_id = $1 AND signal_id = $2 LIMIT 1',
      [userId, signalId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await query('DELETE FROM bookmarks WHERE user_id = $1 AND signal_id = $2', [userId, signalId]);
      return res.json({ bookmarked: false, signal_id: signalId });
    }

    await query(
      `INSERT INTO bookmarks (user_id, signal_id)
       VALUES ($1, $2)`,
      [userId, signalId]
    );

    return res.status(201).json({ bookmarked: true, signal_id: signalId });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to toggle bookmark',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

router.get('/bookmarks', authMiddleware, async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const result = await query<BookmarkedSignalRow>(
      `SELECT s.id,
              s.label,
              s.summary,
              s.velocity,
              s.created_at,
              COALESCE(array_length(s.article_ids, 1), 0)::int AS article_count,
              b.created_at AS bookmarked_at
       FROM bookmarks b
       INNER JOIN signals s ON s.id = b.signal_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC, s.id DESC`,
      [userId]
    );

    return res.json({ items: result.rows });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch bookmarks',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

export default router;
