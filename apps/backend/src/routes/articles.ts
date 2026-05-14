import { Router } from 'express';
import { query } from '../db';

type ArticleRow = {
  id: number;
  source_id: number;
  title: string;
  url: string;
  content: string | null;
  published_at: string | null;
};

const router = Router();

router.get('/', async (req, res) => {
  const limit = Number(req.query.limit ?? 25);

  try {
    const result = await query<ArticleRow>(
      `SELECT id, source_id, title, url, content, published_at
       FROM articles
       ORDER BY published_at DESC NULLS LAST, id DESC
       LIMIT $1`,
      [Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 25]
    );

    res.json({ items: result.rows });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch articles',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

export default router;
