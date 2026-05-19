import { Router } from 'express';
import { query } from '../db';

type SignalRow = {
  id: number;
  label: string | null;
  summary: string | null;
  created_at: string;
  article_count: number;
  velocity: number;
};

type SignalDetailRow = {
  id: number;
  label: string | null;
  summary: string | null;
  velocity: number;
  created_at: string;
  article_id: number | null;
  title: string | null;
  url: string | null;
  image_url: string | null;
  source_name: string | null;
  published_at: string | null;
};

type SourceRow = {
  id: number;
  name: string;
  url: string;
  niche: string | null;
  created_at: string;
};

const router = Router();

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

router.get('/signals', async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
  const offset = (page - 1) * limit;

  try {
    const totalResult = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM signals');
    const totalItems = Number(totalResult.rows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const result = await query<SignalRow>(
      `SELECT id,
              label,
              summary,
          velocity,
              created_at,
              COALESCE(array_length(article_ids, 1), 0)::int AS article_count
       FROM signals
        ORDER BY velocity DESC, created_at DESC, id DESC
       LIMIT $1
      OFFSET $2`,
      [limit, offset]
    );

    res.json({
      items: result.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch signals',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

router.get('/signals/:id', async (req, res) => {
  const signalId = Number(req.params.id);

  if (!Number.isInteger(signalId) || signalId <= 0) {
    return res.status(400).json({ message: 'invalid signal id' });
  }

  try {
    const result = await query<SignalDetailRow>(
      `SELECT s.id,
              s.label,
              s.summary,
              s.velocity,
              s.created_at,
              a.id AS article_id,
              a.title,
              a.url,
              a.image_url,
              src.name AS source_name,
              a.published_at
       FROM signals s
       LEFT JOIN LATERAL unnest(s.article_ids) AS aid(article_id) ON TRUE
       LEFT JOIN articles a ON a.id = aid.article_id
       LEFT JOIN sources src ON src.id = a.source_id
       WHERE s.id = $1
       ORDER BY a.published_at DESC NULLS LAST, a.id DESC`,
      [signalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'signal not found' });
    }

    const base = result.rows[0];
    const articles = result.rows
      .filter((row) => row.article_id !== null)
      .map((row) => ({
        id: row.article_id as number,
        title: row.title,
        url: row.url,
        image_url: row.image_url,
        source_name: row.source_name,
        published_at: row.published_at,
      }));

    return res.json({
      id: base.id,
      label: base.label,
      summary: base.summary,
      velocity: base.velocity,
      created_at: base.created_at,
      article_count: articles.length,
      articles,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch signal detail',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

router.get('/sources', async (_req, res) => {
  try {
    const result = await query<SourceRow>(
      `SELECT id, name, url, niche, created_at
       FROM sources
       ORDER BY niche NULLS LAST, created_at DESC, id DESC`
    );

    const grouped: Record<string, SourceRow[]> = {};
    for (const source of result.rows) {
      const nicheKey = source.niche?.trim() || 'uncategorized';
      if (!grouped[nicheKey]) {
        grouped[nicheKey] = [];
      }
      grouped[nicheKey].push(source);
    }

    res.json({ items: grouped });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch grouped sources',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

export default router;
