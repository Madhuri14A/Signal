import { pool, query } from '../db';

type ArticleRow = {
  id: number;
};

const SIMILARITY_THRESHOLD = 0.82;
const COSINE_DISTANCE_THRESHOLD = 1 - SIMILARITY_THRESHOLD;
const MIN_CLUSTER_SIZE = 2;

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
    `SELECT id
     FROM articles
     WHERE embedding IS NOT NULL
     ORDER BY id ASC`
  );

  return result.rows;
}

async function fetchSimilarArticleIds(articleId: number): Promise<number[]> {
  const result = await query<{ id: number }>(
    `SELECT id
     FROM articles
     WHERE id <> $1
       AND embedding IS NOT NULL
       AND embedding <=> (SELECT embedding FROM articles WHERE id = $1) < $2
     ORDER BY id ASC`,
    [articleId, COSINE_DISTANCE_THRESHOLD]
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

async function insertSignal(articleIds: number[], velocity: number) {
  await query(
    `INSERT INTO signals (label, summary, article_ids, velocity)
     VALUES ($1, $2, $3::bigint[], $4)`,
    [null, null, articleIds, velocity]
  );
}

export async function runClustering() {
  const articles = await fetchEmbeddedArticles();
  const ids = articles.map((a) => a.id);

  if (ids.length === 0) {
    console.log('no embedded articles found');
    return;
  }

  console.log(`embedded articles found: ${ids.length}`);
  console.log(`using similarity threshold: > ${SIMILARITY_THRESHOLD}`);

  const uf = new UnionFind(ids);

  for (const id of ids) {
    const similarIds = await fetchSimilarArticleIds(id);

    for (const similarId of similarIds) {
      uf.union(id, similarId);
    }
  }

  const clusters = uf
    .groups()
    .filter((cluster) => cluster.length >= MIN_CLUSTER_SIZE)
    .sort((a, b) => b.length - a.length);

  console.log(`clusters detected (size >= ${MIN_CLUSTER_SIZE}): ${clusters.length}`);

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

    const velocity = await calculateVelocity(articleIds);

    await insertSignal(articleIds, velocity);
    inserted += 1;

    console.log(`inserted signal ${inserted}: ${articleIds.length} articles, velocity=${velocity}`);
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
