import axios from 'axios';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import Parser from 'rss-parser';
import { pool, query } from '../db';

type SourceRow = {
  id: number;
  name: string;
  url: string;
};

type FeedItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: { url?: string };
  image?: { url?: string };
  ['itunes:image']?: { href?: string } | string;
  ['media:thumbnail']?: { $?: { url?: string } } | { url?: string };
  ['media:content']?: { $?: { url?: string } } | { url?: string };
};

const parser = new Parser<Record<string, never>, FeedItem>();
const FRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_WORD_COUNT = 500;

const NOISE_TITLE_PATTERN = /\b(release|v\d+\.|changelog|fix|bug|patch)\b/i;
const THOUGHTFUL_TITLE_PATTERN = /\b(why|how|future|thoughts|notes on|essay)\b/i;

async function fetchSources() {
  const result = await query<SourceRow>(
    'SELECT id, name, url FROM sources ORDER BY id ASC'
  );

  return result.rows;
}

function extractImageFromHtml(content: string): string | null {
  const imgSrcMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgSrcMatch?.[1]?.trim() || null;
}

function readMediaUrl(
  media: { $?: { url?: string } } | { url?: string } | undefined
): string | null {
  if (!media || typeof media !== 'object') {
    return null;
  }

  if ('$' in media && media.$?.url?.trim()) {
    return media.$.url.trim();
  }

  if ('url' in media && media.url?.trim()) {
    return media.url.trim();
  }

  return null;
}

function extractImageUrl(item: FeedItem): string | null {
  const fromEnclosure = item.enclosure?.url?.trim();
  if (fromEnclosure) {
    return fromEnclosure;
  }

  const fromImage = item.image?.url?.trim();
  if (fromImage) {
    return fromImage;
  }

  const itunesImage = item['itunes:image'];
  if (typeof itunesImage === 'string' && itunesImage.trim()) {
    return itunesImage.trim();
  }
  if (itunesImage && typeof itunesImage === 'object' && itunesImage.href?.trim()) {
    return itunesImage.href.trim();
  }

  const mediaThumbnail = item['media:thumbnail'];
  const fromThumbnail = readMediaUrl(mediaThumbnail);
  if (fromThumbnail) {
    return fromThumbnail;
  }

  const mediaContent = item['media:content'];
  const fromMediaContent = readMediaUrl(mediaContent);
  if (fromMediaContent) {
    return fromMediaContent;
  }

  const htmlContent = item.content ?? item.summary ?? '';
  return extractImageFromHtml(htmlContent);
}

function isFreshArticle(item: FeedItem): boolean {
  const rawPublishedAt = item.isoDate ?? item.pubDate;
  if (!rawPublishedAt) {
    return true;
  }

  const publishedAtMs = new Date(rawPublishedAt).getTime();
  if (!Number.isFinite(publishedAtMs)) {
    return true;
  }

  return Date.now() - publishedAtMs <= FRESH_WINDOW_MS;
}

function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  if (!text) {
    return 0;
  }

  return text.split(/\s+/).filter(Boolean).length;
}

function extractImageFromReadableHtml(html: string | null): string | null {
  if (!html) {
    return null;
  }

  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1]?.trim() || null;
}

async function fetchReadableArticle(url: string): Promise<{
  content: string;
  wordCount: number;
  imageUrl: string | null;
} | null> {
  try {
    const response = await axios.get<string>(url, {
      timeout: 15000,
      responseType: 'text',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const dom = new JSDOM(response.data, { url });
    const readable = new Readability(dom.window.document).parse();
    if (!readable?.textContent) {
      return null;
    }

    const normalizedContent = normalizeText(readable.textContent);
    const wordCount = countWords(normalizedContent);
    const imageUrl = extractImageFromReadableHtml(readable.content ?? null);

    return {
      content: normalizedContent,
      wordCount,
      imageUrl,
    };
  } catch {
    return null;
  }
}

function shouldSkipByTitle(title: string): boolean {
  return NOISE_TITLE_PATTERN.test(title);
}

function calculateQualityScore(title: string, wordCount: number): number {
  let score = 0;

  if (wordCount > 1000) {
    score += 3;
  }

  if (THOUGHTFUL_TITLE_PATTERN.test(title)) {
    score += 2;
  }

  if (NOISE_TITLE_PATTERN.test(title)) {
    score -= 3;
  }

  return score;
}

async function insertArticle(sourceId: number, item: FeedItem) {
  const title = item.title?.trim();
  const url = item.link?.trim();
  const publishedAt = item.isoDate ?? item.pubDate ?? null;

  if (!title || !url) {
    return false;
  }

  if (!isFreshArticle(item)) {
    return false;
  }

  if (shouldSkipByTitle(title)) {
    return false;
  }

  const readableArticle = await fetchReadableArticle(url);
  if (!readableArticle) {
    return false;
  }

  if (readableArticle.wordCount < MIN_WORD_COUNT) {
    return false;
  }

  const content = readableArticle.content;
  const imageUrl = extractImageUrl(item) ?? readableArticle.imageUrl;
  const qualityScore = calculateQualityScore(title, readableArticle.wordCount);

  const result = await query(
    `INSERT INTO articles (source_id, title, url, content, image_url, quality_score, word_count, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (url) DO NOTHING`,
    [sourceId, title, url, content, imageUrl, qualityScore, readableArticle.wordCount, publishedAt]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function runRssFetcher() {
  const sources = await fetchSources();
  let insertedCount = 0;

  for (const source of sources) {
    try {
      console.log(`fetching: ${source.name} -> ${source.url}`);
      const feed = await parser.parseURL(source.url);
      const items = feed.items ?? [];

      for (const item of items) {
        const inserted = await insertArticle(source.id, item);
        if (inserted) {
          insertedCount += 1;
        }
      }

      console.log(`done: ${source.name} (${items.length} items checked)`);
    } catch (error) {
      console.error(`failed: ${source.name}`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`rss fetch complete: ${insertedCount} new articles inserted`);
}

if (require.main === module) {
  runRssFetcher()
    .catch((error) => {
      console.error('rss fetcher crashed', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
