import { pool, query } from './index';

type SourceSeed = {
  name: string;
  url: string;
  niche: string;
};

const sources: SourceSeed[] = [
  {
    name: 'Paul Graham',
    url: 'https://paulgraham.com/rss.html',
    niche: 'startup',
  },
  {
    name: 'Simon Willison',
    url: 'https://simonwillison.net/atom/everything/',
    niche: 'ai',
  },
  {
    name: 'Josh Comeau',
    url: 'https://www.joshwcomeau.com/rss.xml',
    niche: 'fullstack',
  },
  {
    name: 'Indie Hackers',
    url: 'https://www.indiehackers.com/feed.xml',
    niche: 'startup',
  },
  {
    name: 'Dev.to',
    url: 'https://dev.to/feed',
    niche: 'fullstack',
  },
];

async function ensureSourcesUrlUniqueConstraint() {
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sources_url_key'
      ) THEN
        ALTER TABLE sources
        ADD CONSTRAINT sources_url_key UNIQUE (url);
      END IF;
    END $$;
  `);
}

async function seedSources() {
  try {
    await ensureSourcesUrlUniqueConstraint();

    for (const source of sources) {
      await query(
        `INSERT INTO sources (name, url, niche)
         VALUES ($1, $2, $3)
         ON CONFLICT (url) DO NOTHING`,
        [source.name, source.url, source.niche]
      );
    }

    const result = await query<{ id: number; name: string; url: string; niche: string | null }>(
      'SELECT id, name, url, niche FROM sources ORDER BY id ASC'
    );

    console.log(`seeded sources: ${result.rowCount}`);
    for (const row of result.rows) {
      console.log(`- ${row.name} (${row.niche ?? 'general'}) -> ${row.url}`);
    }
  } catch (error) {
    console.error('failed to seed sources', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedSources();