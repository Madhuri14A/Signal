import dotenv from 'dotenv';
import axios from 'axios';
import { pool, query } from '../db';

dotenv.config();

type SignalRow = {
  id: number;
  article_ids: unknown;
};

type ArticleRow = {
  id: number;
  title: string;
  content: string | null;
};

type LabelResponse = {
  label: string;
  summary: string;
};

const PRIMARY_MODEL = process.env.GEMINI_LABEL_MODEL || 'models/gemini-1.5-flash';
const FALLBACK_MODELS = ['models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash'];
const BATCH_SIZE = 100;
const USE_LOCAL_LABELING = process.env.LOCAL_LABELING === 'true';

function normalizeArticleIds(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[{}]/g, '').trim();
    if (!cleaned) {
      return [];
    }
    return cleaned
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
  }

  return [];
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseLabelResponse(raw: string): LabelResponse {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned) as Partial<LabelResponse>;

  const label = (parsed.label ?? '').toString().trim();
  const summary = (parsed.summary ?? '').toString().trim();

  if (!label || !summary) {
    throw new Error('Gemini response missing label or summary');
  }

  return {
    label: label.slice(0, 120),
    summary,
  };
}

function buildPrompt(articles: ArticleRow[]): string {
  const titles = articles
    .map((article, index) => `${index + 1}. ${article.title}`)
    .join('\n');

  return [
    'Here are article titles from multiple sources this week:',
    titles,
    '',
    'What single emerging idea connects them? Respond with a punchy 5-7 word label (title case, no jargon codes) and a 2 sentence summary. JSON: {label, summary}',
  ].join('\n');
}

function generateLocalLabelAndSummary(articles: ArticleRow[]): LabelResponse {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'into', 'about', 'how', 'why',
    'what', 'when', 'where', 'using', 'guide', 'tips', 'new', 'best', 'you', 'are', 'all',
  ]);

  const text = articles
    .map((a) => `${a.title} ${(a.content ?? '').slice(0, 180)}`)
    .join(' ')
    .toLowerCase();

  const tokens = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));

  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }

  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);

  const label = (top.join(' ') || 'Related topic signal')
    .split(' ')
    .slice(0, 8)
    .join(' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const summary = `This signal groups ${articles.length} related articles discussing ${top.slice(0, 2).join(' and ') || 'a common topic'}. It was generated using local labeling mode without external API calls.`;

  return { label, summary };
}

async function fetchUnlabeledSignals(): Promise<SignalRow[]> {
  const result = await query<SignalRow>(
    `SELECT id, article_ids
     FROM signals
     WHERE label IS NULL
     ORDER BY id ASC
     LIMIT $1`,
    [BATCH_SIZE]
  );

  return result.rows;
}

async function fetchArticlesByIds(articleIds: number[]): Promise<ArticleRow[]> {
  const result = await query<ArticleRow>(
    `SELECT id, title, content
     FROM articles
     WHERE id = ANY($1::bigint[])
     ORDER BY id ASC`,
    [articleIds]
  );

  return result.rows;
}

async function generateLabelAndSummary(apiKey: string, articles: ArticleRow[]): Promise<LabelResponse> {
  const prompt = buildPrompt(articles);
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        },
        { timeout: 30000 }
      );

      const text = (response.data as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      })?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No text returned from Gemini');
      }

      return parseLabelResponse(text);
    } catch (error) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }

  if (axios.isAxiosError(lastError)) {
    const details = JSON.stringify(lastError.response?.data ?? {});
    throw new Error(`Gemini label model not found. Tried: ${modelsToTry.join(', ')}. Response: ${details}`);
  }

  throw new Error(`Gemini label model not found. Tried: ${modelsToTry.join(', ')}`);
}

async function updateSignalLabel(signalId: number, payload: LabelResponse) {
  await query(
    `UPDATE signals
     SET label = $2,
         summary = $3
     WHERE id = $1`,
    [signalId, payload.label, payload.summary]
  );
}

export async function runLabeler() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !USE_LOCAL_LABELING) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const signals = await fetchUnlabeledSignals();
  if (signals.length === 0) {
    console.log('no unlabeled signals found');
    return;
  }

  console.log(`unlabeled signals found: ${signals.length}`);
  if (USE_LOCAL_LABELING) {
    console.log('local labeling mode enabled (no API/billing)');
  }

  let updated = 0;

  for (const signal of signals) {
    const articleIds = normalizeArticleIds(signal.article_ids);
    if (articleIds.length === 0) {
      console.log(`skip signal ${signal.id}: empty article_ids`);
      continue;
    }

    try {
      const articles = await fetchArticlesByIds(articleIds);
      if (articles.length === 0) {
        console.log(`skip signal ${signal.id}: no matching articles`);
        continue;
      }

      const payload = USE_LOCAL_LABELING
        ? generateLocalLabelAndSummary(articles)
        : await generateLabelAndSummary(apiKey as string, articles);
      await updateSignalLabel(signal.id, payload);
      updated += 1;

      console.log(`updated signal ${signal.id}: ${payload.label}`);
    } catch (error) {
      console.error(
        `failed signal ${signal.id}`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(`labeling complete: ${updated} signals updated`);
}

if (require.main === module) {
  runLabeler()
    .catch((error) => {
      console.error('labeler crashed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
