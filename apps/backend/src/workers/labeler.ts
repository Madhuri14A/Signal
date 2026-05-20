import dotenv from 'dotenv';
import axios from 'axios';
import { CohereClient } from 'cohere-ai';
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
const RATE_LIMIT_DELAY_MS = parseInt(process.env.LABELER_DELAY_MS || '2000', 10);
const USE_COHERE = !!process.env.COHERE_API_KEY && !process.env.GEMINI_API_KEY;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeArticleIds(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[{}]/g, '').trim();
    if (!cleaned) return [];
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
  if (!label || !summary) throw new Error('Response missing label or summary');
  return { label: label.slice(0, 120), summary };
}

function buildPrompt(articles: ArticleRow[]): string {
  const titles = articles
    .map((article, index) => `${index + 1}. ${article.title}`)
    .join('\n');
  return [
    'Here are article titles from multiple sources this week:',
    titles,
    '',
    'What single emerging idea connects them? Respond with a punchy 5-7 word label (title case, no jargon codes) and a 2 sentence summary. JSON: {"label": "...", "summary": "..."}',
  ].join('\n');
}

function generateLocalLabelAndSummary(articles: ArticleRow[]): LabelResponse {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'into', 'about', 'how', 'why',
    'what', 'when', 'where', 'using', 'guide', 'tips', 'new', 'best', 'you', 'are', 'all',
    'they', 'them', 'their', 'those', 'these', 'be', 'is', 'as', 'at', 'by', 'on', 'or',
    'in', 'to', 'of', 'a', 'an', 'but', 'can', 'has', 'have', 'had', 'was', 'were', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'get', 'got', 'do', 'does', 'did',
    'says', 'said', 'say', 'one', 'two', 'three', 'five', 'day', 'week', 'year', 'time',
  ]);
  const termFreq = new Map<string, number>();
  for (const article of articles) {
    const words = article.title
      .split(/[\s\-:,()]+/)
      .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()))
      .map((w) => w.toLowerCase());
    for (const word of words) {
      termFreq.set(word, (termFreq.get(word) ?? 0) + 1);
    }
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
        termFreq.set(phrase, (termFreq.get(phrase) ?? 0) + 0.5);
      }
    }
  }
  const sortedTerms = [...termFreq.entries()].sort((a, b) => b[1] - a[1]).map(([term]) => term);
  const uniqueTerms: string[] = [];
  const seen = new Set<string>();
  for (const term of sortedTerms) {
    if (!uniqueTerms.length || (!seen.has(term) && !term.split(/\s+/).some((w) => seen.has(w)))) {
      uniqueTerms.push(term);
      term.split(/\s+/).forEach((w) => seen.add(w));
      if (uniqueTerms.length >= 3) break;
    }
  }
  let label = uniqueTerms
    .map((term) =>
      term.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    )
    .join(', ')
    .slice(0, 120);
  while (label && stopWords.has(label.split(/[\s,]+/).pop()!.toLowerCase())) {
    label = label.split(/[\s,]+/).slice(0, -1).join(' ');
  }
  if (!label.trim()) label = 'Emerging Signal';
  const topicList = uniqueTerms.slice(0, 2).join(' and ');
  const summary = `This signal groups ${articles.length} related articles discussing ${topicList || 'a common topic'}. Generated via local analysis.`;
  return { label, summary };
}

async function generateLabelWithCohere(apiKey: string, articles: ArticleRow[]): Promise<LabelResponse> {
  const cohere = new CohereClient({ token: apiKey });
  const prompt = buildPrompt(articles);
  const response = await cohere.chat({
    model: 'command-a-03-2025',
    message: prompt,
    temperature: 0.3,
  });
  const text = response.text?.trim();
  if (!text) throw new Error('No text returned from Cohere');
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error(`Cohere response missing JSON: ${text.slice(0, 200)}`);
  return parseLabelResponse(jsonMatch[0]);
}

async function generateLabelWithGemini(apiKey: string, articles: ArticleRow[]): Promise<LabelResponse> {
  const prompt = buildPrompt(articles);
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: unknown;
  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        },
        { timeout: 30000 }
      );
      const text = (response.data as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      })?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No text returned from Gemini');
      return parseLabelResponse(text);
    } catch (error) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const backoffMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : RATE_LIMIT_DELAY_MS * 5;
        console.log(`hit rate limit (429), waiting ${backoffMs}ms before retry...`);
        await delay(backoffMs);
        continue;
      }
      if (axios.isAxiosError(error) && error.response?.status === 404) continue;
      throw error;
    }
  }
  throw new Error(`Gemini label failed. Tried: ${modelsToTry.join(', ')}. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function fetchUnlabeledSignals(): Promise<SignalRow[]> {
  const result = await query<SignalRow>(
    `SELECT id, article_ids FROM signals WHERE label IS NULL ORDER BY id ASC LIMIT $1`,
    [BATCH_SIZE]
  );
  return result.rows;
}

async function fetchArticlesByIds(articleIds: number[]): Promise<ArticleRow[]> {
  const result = await query<ArticleRow>(
    `SELECT id, title, content FROM articles WHERE id = ANY($1::bigint[]) ORDER BY id ASC`,
    [articleIds]
  );
  return result.rows;
}

async function updateSignalLabel(signalId: number, payload: LabelResponse) {
  await query(
    `UPDATE signals SET label = $2, summary = $3 WHERE id = $1`,
    [signalId, payload.label, payload.summary]
  );
}

export async function runLabeler() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const cohereKey = process.env.COHERE_API_KEY;

  if (!geminiKey && !cohereKey && !USE_LOCAL_LABELING) {
    throw new Error('GEMINI_API_KEY or COHERE_API_KEY is required');
  }

  const signals = await fetchUnlabeledSignals();
  if (signals.length === 0) {
    console.log('no unlabeled signals found');
    return;
  }

  console.log(`unlabeled signals found: ${signals.length}`);
  if (USE_LOCAL_LABELING) {
    console.log('local labeling mode enabled (no API/billing)');
  } else if (USE_COHERE) {
    console.log('cohere labeling mode enabled (command-r-plus)');
  } else {
    console.log('gemini labeling mode enabled');
  }

  let updated = 0;

  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];
    if (i > 0) {
      console.log(`waiting ${RATE_LIMIT_DELAY_MS}ms before next request...`);
      await delay(RATE_LIMIT_DELAY_MS);
    }

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

      let payload: LabelResponse;
      if (USE_LOCAL_LABELING) {
        payload = generateLocalLabelAndSummary(articles);
      } else if (USE_COHERE) {
        payload = await generateLabelWithCohere(cohereKey as string, articles);
      } else {
        payload = await generateLabelWithGemini(geminiKey as string, articles);
      }

      await updateSignalLabel(signal.id, payload);
      updated += 1;
      console.log(`updated signal ${signal.id}: ${payload.label}`);
    } catch (error) {
      console.error(`failed signal ${signal.id}`, error instanceof Error ? error.message : error);
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
