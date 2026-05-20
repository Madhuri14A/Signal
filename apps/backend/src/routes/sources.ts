import { Router } from 'express';
import { query } from '../db';

type SourceRow = {
  id: number;
  name: string;
  url: string;
  niche: string | null;
  created_at: string;
};

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query<SourceRow>(
      'SELECT id, name, url, niche, created_at FROM sources ORDER BY created_at DESC'
    );

    const grouped = result.rows.reduce<Record<string, SourceRow[]>>((acc, row) => {
      const key = row.niche?.trim().toLowerCase() || 'general';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    }, {});

    res.json({ items: grouped });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch sources',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

router.post('/', async (req, res) => {
  const { name, url, niche } = req.body as { name?: string; url?: string; niche?: string };

  if (!name || !url) {
    return res.status(400).json({ message: 'name and url are required' });
  }

  try {
    const result = await query<SourceRow>(
      `INSERT INTO sources (name, url, niche)
       VALUES ($1, $2, $3)
       RETURNING id, name, url, niche, created_at`,
      [name, url, niche ?? null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create source',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

export default router;
