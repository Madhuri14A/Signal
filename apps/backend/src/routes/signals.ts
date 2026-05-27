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

type DailyReadRow = {
  title: string;
  url: string;
  source_name: string | null;
  image_url: string | null;
  published_at: string | null;
  niche: string;
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
    const totalResult = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM signals WHERE COALESCE(status, 'active') = 'active'"
    );
    const totalItems = Number(totalResult.rows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const activeResult = await query<SignalRow>(
      `SELECT id,
              label,
              summary,
              velocity,
              created_at,
              COALESCE(array_length(article_ids, 1), 0)::int AS article_count
       FROM signals
       WHERE COALESCE(status, 'active') = 'active'
       ORDER BY velocity DESC, created_at DESC, id DESC
       LIMIT $1
       OFFSET $2`,
      [limit, offset]
    );

    const archivedResult = await query<SignalRow>(
      `SELECT id,
              label,
              summary,
              velocity,
              created_at,
              COALESCE(array_length(article_ids, 1), 0)::int AS article_count
       FROM signals
       WHERE status = 'archived'
       ORDER BY created_at DESC, id DESC
       LIMIT 18`
    );

    res.json({
      items: activeResult.rows,
      archived_items: archivedResult.rows,
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

router.get('/daily-reads', async (_req, res) => {
  try {
    const result = await query<DailyReadRow>(
      `SELECT title,
              url,
              source_name,
              image_url,
              published_at,
              niche
       FROM (
         SELECT a.title,
                a.url,
                src.name AS source_name,
                a.image_url,
                a.published_at,
                COALESCE(src.niche, 'general') AS niche,
                a.quality_score,
                (a.published_at >= NOW() - INTERVAL '24 hours')::int AS fresh24h,
                ROW_NUMBER() OVER (
                  PARTITION BY COALESCE(src.niche, 'general')
                  ORDER BY (a.published_at >= NOW() - INTERVAL '24 hours')::int DESC,
                           a.quality_score DESC NULLS LAST,
                           a.published_at DESC NULLS LAST,
                           a.id DESC
                ) AS row_rank
         FROM articles a
         INNER JOIN sources src ON src.id = a.source_id
         WHERE a.published_at >= NOW() - INTERVAL '48 hours'
           AND NOT EXISTS (
             SELECT 1
             FROM signals s
             WHERE a.id = ANY(s.article_ids)
           )
       ) sub
       WHERE row_rank = 1
       ORDER BY niche ASC`
    );

    res.json({ items: result.rows });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch daily reads',
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
