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
const MIN_CONTENT_LENGTH = 300;

const NOISE_TITLE_PATTERN = /\b(release|changelog|fix|bug|hotfix|patch|update|v0\.|v1\.|v0|v1)\b/i;
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

function normalizeContent(item: FeedItem): string {
  const raw = item.content ?? item.summary ?? item.contentSnippet ?? '';
  const withoutTags = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  return withoutTags.replace(/\s+/g, ' ').trim();
}

function shouldSkipByTitle(title: string): boolean {
  return NOISE_TITLE_PATTERN.test(title);
}

function calculateQualityScore(title: string, contentLength: number): number {
  let score = 0;

  if (contentLength > 1000) {
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
  const normalizedContent = normalizeContent(item);
  const content = normalizedContent || null;
  const contentLength = normalizedContent.length;
  const publishedAt = item.isoDate ?? item.pubDate ?? null;
  const imageUrl = extractImageUrl(item);

  if (!title || !url) {
    return false;
  }

  if (!isFreshArticle(item)) {
    return false;
  }

  if (shouldSkipByTitle(title)) {
    return false;
  }

  if (contentLength <= MIN_CONTENT_LENGTH) {
    return false;
  }

  const qualityScore = calculateQualityScore(title, contentLength);

  const result = await query(
    `INSERT INTO articles (source_id, title, url, content, image_url, quality_score, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (url) DO NOTHING`,
    [sourceId, title, url, content, imageUrl, qualityScore, publishedAt]
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
