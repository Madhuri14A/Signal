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
    name: 'Y Combinator',
    url: 'https://www.ycombinator.com/blog/rss',
    niche: 'startup',
  },
  {
    name: 'Mark Suster',
    url: 'https://bothsidesofthetable.com/feed',
    niche: 'startup',
  },
  {
    name: 'Chris Dixon',
    url: 'https://cdixon.org/feed',
    niche: 'startup',
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    niche: 'startup',
  },
  {
    name: 'VentureBeat',
    url: 'https://feeds.feedburner.com/venturebeat/SZYF',
    niche: 'startup',
  },
  {
    name: 'Simon Willison',
    url: 'https://simonwillison.net/atom/entries/',
    niche: 'ai',
  },
  {
    name: 'TLDR AI',
    url: 'https://tldr.tech/api/rss/ai',
    niche: 'ai',
  },
  {
    name: 'The Verge AI',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    niche: 'ai',
  },
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
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
  {
    name: 'CSS Tricks',
    url: 'https://css-tricks.com/feed/',
    niche: 'fullstack',
  },
  {
    name: 'JavaScript Weekly',
    url: 'https://javascriptweekly.com/rss/',
    niche: 'fullstack',
  },
  {
    name: 'Creative Bloq',
    url: 'https://www.creativebloq.com/rss',
    niche: 'artist',
  },
  {
    name: 'Abduzeedo Design',
    url: 'https://feeds.feedburner.com/abduzeedo',
    niche: 'artist',
  },
  {
    name: 'Print Magazine',
    url: 'https://www.printmag.com/feed/',
    niche: 'artist',
  },
  {
    name: 'Philosophy Now',
    url: 'https://philosophynow.org/rss',
    niche: 'philosophy',
  },
  {
    name: 'Aeon Essays',
    url: 'https://aeon.co/feed.rss',
    niche: 'philosophy',
  },
  {
    name: 'Nautilus',
    url: 'https://nautil.us/feed/',
    niche: 'philosophy',
  },
  {
    name: 'Longreads',
    url: 'https://longreads.com/feed/',
    niche: 'editorial',
  },
  {
    name: 'The Atlantic',
    url: 'https://theatlantic.com/feed/all/',
    niche: 'editorial',
  },
  {
    name: 'Harpers',
    url: 'https://harpers.org/feed/',
    niche: 'editorial',
  },
  {
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    niche: 'editorial',
  },
  {
    name: 'NYT Technology',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    niche: 'editorial',
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

async function ensureSourcesNameUniqueConstraint() {
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sources_name_key'
      ) THEN
        ALTER TABLE sources
        ADD CONSTRAINT sources_name_key UNIQUE (name);
      END IF;
    END $$;
  `);
}

async function seedSources() {
  try {
    await ensureSourcesUrlUniqueConstraint();
    await ensureSourcesNameUniqueConstraint();

    for (const source of sources) {
      await query(
        `INSERT INTO sources (name, url, niche)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE
         SET url = EXCLUDED.url,
             niche = EXCLUDED.niche`,
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