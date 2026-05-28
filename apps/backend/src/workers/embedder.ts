import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CohereClient } from 'cohere-ai';
import { pool, query } from '../db';

dotenv.config();

type ArticleRow = {
  id: number;
  title: string;
  content: string | null;
};

type EmbedderCheckpoint = {
  lastProcessedArticleId: number;
};

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 2000;
const MIN_WORD_COUNT = 300;
const CHECKPOINT_FILE = path.resolve(process.cwd(), 'embedder-checkpoint.json');
const COHERE_EMBED_MODEL = 'embed-english-v3.0';
const EMBEDDING_DIMENSION = 1024;

function buildEmbeddingInput(article: ArticleRow): string {
  const title = article.title?.trim() ?? '';
  const content = article.content?.trim() ?? '';
  const combined = `${title}\n\n${content}`.trim();
  return combined.slice(0, 12000);
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

async function readCheckpoint(): Promise<number> {
  try {
    const raw = await fs.readFile(CHECKPOINT_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<EmbedderCheckpoint>;
    const checkpointId = Number(parsed.lastProcessedArticleId);
    if (!Number.isFinite(checkpointId) || checkpointId < 0) return 0;
    return checkpointId;
  } catch {
    return 0;
  }
}

async function writeCheckpoint(lastProcessedArticleId: number): Promise<void> {
  await fs.writeFile(
    CHECKPOINT_FILE,
    JSON.stringify({ lastProcessedArticleId } satisfies EmbedderCheckpoint, null, 2),
    'utf8'
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchArticlesWithoutEmbedding(
  limit: number,
  startAfterId: number
): Promise<ArticleRow[]> {
  const result = await query<ArticleRow>(
    `SELECT id, title, content
     FROM articles
     WHERE embedding IS NULL
       AND word_count >= $2
       AND id > $3
     ORDER BY id ASC
     LIMIT $1`,
    [limit, MIN_WORD_COUNT, startAfterId]
  );
  return result.rows;
}

async function updateArticleEmbedding(articleId: number, embedding: number[]) {
  const vector = toVectorLiteral(embedding);
  await query(
    `UPDATE articles SET embedding = $2::vector WHERE id = $1`,
    [articleId, vector]
  );
}

function isQuotaError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return message.includes('quota') || message.includes('rate limit') || message.includes('too many requests');
}

export async function runEmbedder() {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    throw new Error('COHERE_API_KEY is required in your .env file');
  }

  const cohere = new CohereClient({ token: apiKey });

  let checkpointId = await readCheckpoint();
  console.log(`embedding model: ${COHERE_EMBED_MODEL} (${EMBEDDING_DIMENSION} dimensions)`);
  console.log(`embedding filter: word_count >= ${MIN_WORD_COUNT}`);
  console.log(`resuming from checkpoint article id: ${checkpointId}`);

  let totalEmbedded = 0;
  let batchNumber = 0;
  let shouldStop = false;

  while (true) {
    const batch = await fetchArticlesWithoutEmbedding(BATCH_SIZE, checkpointId);
    if (batch.length === 0) break;

    batchNumber += 1;
    console.log(`batch ${batchNumber}: processing ${batch.length} articles`);

    // Build inputs for the whole batch
    const inputs: string[] = [];
    const validArticles: ArticleRow[] = [];

    for (const article of batch) {
      const input = buildEmbeddingInput(article);
      if (!input) {
        console.log(`skip article ${article.id}: empty input`);
        continue;
      }
      inputs.push(input);
      validArticles.push(article);
    }

    if (inputs.length === 0) {
      // All skipped — advance checkpoint to last article id in batch
      checkpointId = batch[batch.length - 1].id;
      await writeCheckpoint(checkpointId);
      continue;
    }

    try {
      // Cohere supports batch embedding — send all at once
      const response = await cohere.embed({
        texts: inputs,
        model: COHERE_EMBED_MODEL,
        inputType: 'search_document',
      });

      const embeddings = response.embeddings;

      if (!Array.isArray(embeddings) || embeddings.length !== validArticles.length) {
        throw new Error(`Expected ${validArticles.length} embeddings, got ${embeddings?.length ?? 0}`);
      }

      for (let i = 0; i < validArticles.length; i++) {
        const article = validArticles[i];
        const embedding = embeddings[i] as number[];

        await updateArticleEmbedding(article.id, embedding);
        checkpointId = article.id;
        await writeCheckpoint(checkpointId);
        totalEmbedded += 1;

        console.log(`embedded article ${article.id} (${i + 1}/${validArticles.length} in batch, total ${totalEmbedded})`);
      }
    } catch (error) {
      if (isQuotaError(error)) {
        console.error('Cohere quota/rate limit hit. Stopping embedder early.');
        console.error('Wait a moment then run `npm run embed` again — checkpoint will resume.');
        shouldStop = true;
      } else {
        console.error('batch failed:', error instanceof Error ? error.message : error);
      }
    }

    if (shouldStop) break;

    console.log(`batch ${batchNumber} complete. waiting ${BATCH_DELAY_MS / 1000}s...`);
    await delay(BATCH_DELAY_MS);
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