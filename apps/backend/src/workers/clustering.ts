import { pool, query } from '../db';

type ArticleRow = {
  id: number;
  niche: string | null;
};

const SIMILARITY_THRESHOLD = 0.75;
const COSINE_DISTANCE_THRESHOLD = 1 - SIMILARITY_THRESHOLD;
const LABEL_SIMILARITY_THRESHOLD = 0.8;

const DEFAULT_MIN_CLUSTER_SIZE = 2;
const MIN_CLUSTER_SIZE_BY_NICHE: Record<string, number> = {
  ai: 3,
  security: 3,
  devtools: 2,
  systems: 2,
  mobile: 2,
};

function getMinClusterSizeForNiche(niche: string | null): number {
  const key = niche?.trim().toLowerCase() ?? 'general';
  return MIN_CLUSTER_SIZE_BY_NICHE[key] ?? DEFAULT_MIN_CLUSTER_SIZE;
}

class UnionFind {
  private parent = new Map<number, number>();

  constructor(ids: number[]) {
    for (const id of ids) {
      this.parent.set(id, id);
    }
  }

  find(x: number): number {
    const p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }

    if (p !== x) {
      const root = this.find(p);
      this.parent.set(x, root);
      return root;
    }

    return x;
  }

  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(rb, ra);
    }
  }

  groups(): number[][] {
    const grouped = new Map<number, number[]>();

    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!grouped.has(root)) {
        grouped.set(root, []);
      }
      grouped.get(root)?.push(id);
    }

    return [...grouped.values()].map((ids) => ids.sort((a, b) => a - b));
  }
}

async function fetchEmbeddedArticles(): Promise<ArticleRow[]> {
  const result = await query<ArticleRow>(
    `SELECT a.id,
            s.niche
     FROM articles a
     INNER JOIN sources s ON s.id = a.source_id
    WHERE embedding IS NOT NULL
      AND quality_score >= 1
     ORDER BY a.id ASC`
  );

  return result.rows;
}

async function fetchSimilarArticleIds(articleId: number, niche: string | null): Promise<number[]> {
  const result = await query<{ id: number }>(
    `SELECT a.id
     FROM articles a
     INNER JOIN sources s ON s.id = a.source_id
     WHERE a.id <> $1
       AND a.embedding IS NOT NULL
       AND COALESCE(s.niche, 'general') = COALESCE($3::text, 'general')
       AND a.embedding <=> (SELECT embedding FROM articles WHERE id = $1) < $2
     ORDER BY a.id ASC`,
    [articleId, COSINE_DISTANCE_THRESHOLD, niche]
  );

  return result.rows.map((row) => row.id);
}

async function signalExists(articleIds: number[]): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM signals s
       WHERE (
         SELECT array_agg(x ORDER BY x)
         FROM unnest(s.article_ids) AS x
       ) = $1::bigint[]
     ) AS exists`,
    [articleIds]
  );

  return result.rows[0]?.exists ?? false;
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  
  let matches = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) matches++;
  }
  return matches / maxLen;
}

async function labelIsDuplicate(articleIds: number[]): Promise<boolean> {
  const existingSignals = await query<{ label: string }>(
    `SELECT label FROM signals WHERE label IS NOT NULL`,
    []
  );
  
  if (existingSignals.rows.length === 0) return false;
  
  // Get first article title as proxy for cluster theme
  const result = await query<{ title: string }>(
    `SELECT title FROM articles WHERE id = $1 LIMIT 1`,
    [articleIds[0]]
  );
  
  const clusterTheme = result.rows[0]?.title ?? '';
  
  for (const row of existingSignals.rows) {
    const similarity = calculateStringSimilarity(clusterTheme, row.label);
    if (similarity >= LABEL_SIMILARITY_THRESHOLD) {
      return true;
    }
  }
  
  return false;
}

async function calculateVelocity(articleIds: number[]): Promise<number> {
  const result = await query<{ velocity: number }>(
    `SELECT COUNT(*)::int AS velocity
     FROM articles
     WHERE id = ANY($1::bigint[])
       AND published_at IS NOT NULL
       AND published_at >= NOW() - INTERVAL '48 hours'`,
    [articleIds]
  );

  return result.rows[0]?.velocity ?? 0;
}

async function getSignalNiche(articleIds: number[]): Promise<string | null> {
  const result = await query<{ niche: string | null }>(
    `SELECT COALESCE(s.niche, 'general') AS niche
     FROM articles a
     INNER JOIN sources s ON s.id = a.source_id
     WHERE a.id = ANY($1::bigint[])
     LIMIT 1`,
    [articleIds]
  );
  return result.rows[0]?.niche ?? null;
}

async function archiveOldSignals(): Promise<number> {
  const result = await query<{ count: number }>(
    `UPDATE signals
     SET status = 'archived'
     WHERE status = 'active'
       AND (
         SELECT MAX(a.published_at)
         FROM articles a
         WHERE a.id = ANY(article_ids)
       ) < NOW() - INTERVAL '14 days'
     RETURNING id`,
    []
  );
  return result.rows.length;
}

async function insertSignal(articleIds: number[], velocity: number, niche: string | null): Promise<void> {
  await query(
    `INSERT INTO signals (label, summary, article_ids, velocity, status, niche)
     VALUES ($1, $2, $3::bigint[], $4, $5, $6)`,
    [null, null, articleIds, velocity, 'active', niche]
  );
}

export async function runClustering() {
  const articles = await fetchEmbeddedArticles();
  const ids = articles.map((a) => a.id);
  const nicheById = new Map(articles.map((a) => [a.id, a.niche]));

  if (ids.length === 0) {
    console.log('no embedded articles found');
    return;
  }

  console.log(`embedded articles found: ${ids.length}`);
  console.log(`using similarity threshold: > ${SIMILARITY_THRESHOLD}`);

  // Archive signals with articles older than 14 days
  const archived = await archiveOldSignals();
  if (archived > 0) {
    console.log(`archived ${archived} old signals`);
  }

  const uf = new UnionFind(ids);

  for (const id of ids) {
    const similarIds = await fetchSimilarArticleIds(id, nicheById.get(id) ?? null);

    for (const similarId of similarIds) {
      uf.union(id, similarId);
    }
  }

  const clusters = uf
    .groups()
    .filter((cluster) => {
      const sampleId = cluster[0];
      const niche = nicheById.get(sampleId) ?? null;
      const minClusterSize = getMinClusterSizeForNiche(niche);
      return cluster.length >= minClusterSize;
    })
    .sort((a, b) => b.length - a.length);

  console.log(`clusters detected (niche-based minimum): ${clusters.length}`);

  let inserted = 0;
  const runKeys = new Set<string>();

  for (const articleIds of clusters) {
    const key = articleIds.join(',');
    if (runKeys.has(key)) {
      continue;
    }
    runKeys.add(key);

    const alreadyExists = await signalExists(articleIds);
    if (alreadyExists) {
      console.log(`skip existing signal: [${key}]`);
      continue;
    }

    const isDuplicate = await labelIsDuplicate(articleIds);
    if (isDuplicate) {
      console.log(`skip duplicate label: [${key}]`);
      continue;
    }

    const velocity = await calculateVelocity(articleIds);
    const niche = await getSignalNiche(articleIds);

    await insertSignal(articleIds, velocity, niche);
    inserted += 1;

    console.log(`inserted signal ${inserted}: ${articleIds.length} articles, velocity=${velocity}, niche=${niche}`);
  }

  console.log(`clustering complete: ${inserted} signals inserted`);
}

if (require.main === module) {
  runClustering()
    .catch((error) => {
      console.error('clustering worker crashed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
