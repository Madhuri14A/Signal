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
};

const parser = new Parser<Record<string, never>, FeedItem>();

async function fetchSources() {
  const result = await query<SourceRow>(
    'SELECT id, name, url FROM sources ORDER BY id ASC'
  );

  return result.rows;
}

async function insertArticle(sourceId: number, item: FeedItem) {
  const title = item.title?.trim();
  const url = item.link?.trim();
  const content = item.contentSnippet ?? item.summary ?? item.content ?? null;
  const publishedAt = item.isoDate ?? item.pubDate ?? null;

  if (!title || !url) {
    return false;
  }

  const result = await query(
    `INSERT INTO articles (source_id, title, url, content, published_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (url) DO NOTHING`,
    [sourceId, title, url, content, publishedAt]
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
