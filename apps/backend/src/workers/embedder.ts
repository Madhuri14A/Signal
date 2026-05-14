import dotenv from 'dotenv';
import axios from 'axios';
import { pool, query } from '../db';

dotenv.config();

type ArticleRow = {
  id: number;
  title: string;
  content: string | null;
};

const BATCH_SIZE = 100;
const PRIMARY_GEMINI_MODEL = process.env.GEMINI_EMBED_MODEL || 'models/gemini-embedding-001';
const FALLBACK_GEMINI_MODEL = 'models/text-embedding-004';
const USE_LOCAL_EMBEDDINGS = process.env.LOCAL_EMBEDDINGS === 'true';

function isQuotaError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      return true;
    }

    const axiosMessage = (error.response?.data as { error?: { message?: string } })?.error?.message?.toLowerCase() ?? '';
    return axiosMessage.includes('quota') || axiosMessage.includes('billing') || axiosMessage.includes('resource exhausted');
  }

  const maybeError = error as { status?: number; message?: string };
  if (maybeError?.status === 429) {
    return true;
  }

  const message = maybeError?.message?.toLowerCase() ?? '';
  return message.includes('quota') || message.includes('billing') || message.includes('resource exhausted');
}

function isNotFoundError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 404;
  }

  const maybeError = error as { status?: number };
  return maybeError?.status === 404;
}

function buildEmbeddingInput(article: ArticleRow): string {
  const title = article.title?.trim() ?? '';
  const content = article.content?.trim() ?? '';
  const combined = `${title}\n\n${content}`.trim();

  return combined.slice(0, 12000);
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

function normalizeVectorLength(values: number[], targetLength: number): number[] {
  if (values.length === targetLength) {
    return values;
  }

  if (values.length > targetLength) {
    return values.slice(0, targetLength);
  }

  return [...values, ...new Array(targetLength - values.length).fill(0)];
}

function stringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createLocalEmbedding(input: string, dimension: number): number[] {
  const rand = seededRandom(stringToSeed(input));
  const values = new Array<number>(dimension);

  for (let i = 0; i < dimension; i += 1) {
    values[i] = rand() * 2 - 1;
  }

  let norm = 0;
  for (const v of values) {
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;

  return values.map((v) => v / norm);
}

async function getEmbeddingColumnDimension(): Promise<number> {
  const result = await query<{ type_name: string }>(
    `SELECT format_type(a.atttypid, a.atttypmod) AS type_name
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'articles'
       AND a.attname = 'embedding'
       AND a.attnum > 0
       AND NOT a.attisdropped
     LIMIT 1`
  );

  const typeName = result.rows[0]?.type_name ?? '';
  const match = typeName.match(/vector\((\d+)\)/i);
  if (!match) {
    return 1536;
  }

  return Number(match[1]);
}

async function createGeminiEmbedding(apiKey: string, input: string): Promise<number[]> {
  const modelsToTry = [PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL];
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${apiKey}`,
        {
          model,
          content: {
            parts: [{ text: input }],
          },
        },
        {
          timeout: 30000,
        }
      );

      const values = (response.data as { embedding?: { values?: number[] } })?.embedding?.values;
      if (!values || values.length === 0) {
        throw new Error(`No embedding values returned for model ${model}`);
      }

      return values;
    } catch (error) {
      lastError = error;
      if (isNotFoundError(error)) {
        continue;
      }

      throw error;
    }
  }

  if (axios.isAxiosError(lastError)) {
    const details = JSON.stringify(lastError.response?.data ?? {});
    throw new Error(`Gemini embedding model not found. Tried: ${modelsToTry.join(', ')}. Response: ${details}`);
  }

  throw new Error(`Gemini embedding model not found. Tried: ${modelsToTry.join(', ')}`);
}

async function fetchArticlesWithoutEmbedding(limit: number): Promise<ArticleRow[]> {
  const result = await query<ArticleRow>(
    `SELECT id, title, content
     FROM articles
     WHERE embedding IS NULL
     ORDER BY id ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

async function updateArticleEmbedding(articleId: number, embedding: number[]) {
  const vector = toVectorLiteral(embedding);

  await query(
    `UPDATE articles
     SET embedding = $2::vector
     WHERE id = $1`,
    [articleId, vector]
  );
}

export async function runEmbedder() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!USE_LOCAL_EMBEDDINGS && !apiKey) {
    throw new Error('GEMINI_API_KEY is required unless LOCAL_EMBEDDINGS=true');
  }

  const targetVectorLength = await getEmbeddingColumnDimension();
  console.log(`embedding target dimension: ${targetVectorLength}`);
  if (USE_LOCAL_EMBEDDINGS) {
    console.log('local embedding mode enabled (no billing/API calls)');
  }

  let totalEmbedded = 0;
  let batchNumber = 0;
  let shouldStop = false;

  while (true) {
    const batch = await fetchArticlesWithoutEmbedding(BATCH_SIZE);
    if (batch.length === 0) {
      break;
    }

    batchNumber += 1;
    console.log(`batch ${batchNumber}: processing ${batch.length} articles`);

    for (let i = 0; i < batch.length; i += 1) {
      if (shouldStop) {
        break;
      }

      const article = batch[i];
      const input = buildEmbeddingInput(article);

      if (!input) {
        console.log(`skip article ${article.id}: empty input`);
        continue;
      }

      try {
        const embedding = USE_LOCAL_EMBEDDINGS
          ? createLocalEmbedding(input, targetVectorLength)
          : normalizeVectorLength(await createGeminiEmbedding(apiKey as string, input), targetVectorLength);

        await updateArticleEmbedding(article.id, embedding);
        totalEmbedded += 1;

        console.log(
          `embedded article ${article.id} (${i + 1}/${batch.length} in batch, total ${totalEmbedded})`
        );
      } catch (error) {
        if (isQuotaError(error)) {
          console.error('Gemini quota exceeded. Stopping embedder early.');
          console.error('Top up billing/credits, then run `npm run embed` again.');
          shouldStop = true;
          break;
        }

        if (isNotFoundError(error)) {
          console.error('Gemini embedding endpoint/model returned 404. Stopping early.');
          console.error('Set GEMINI_EMBED_MODEL in .env (try models/gemini-embedding-001).');
          shouldStop = true;
          break;
        }

        console.error(
          `failed article ${article.id}`,
          error instanceof Error ? error.message : error
        );
      }
    }

    if (shouldStop) {
      break;
    }
  }

  console.log(`embedding complete: ${totalEmbedded} articles updated`);
}

if (require.main === module) {
  runEmbedder()
    .catch((error) => {
      console.error('embedder crashed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
