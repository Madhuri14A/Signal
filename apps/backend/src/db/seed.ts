import { pool, query } from './index';

type SourceSeed = {
  name: string;
  url: string;
  niche: string;
};

const sources: SourceSeed[] = [
  // AI
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', niche: 'ai' },
  { name: 'TLDR AI', url: 'https://tldr.tech/api/rss/ai', niche: 'ai' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', niche: 'ai' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', niche: 'ai' },
  { name: 'Import AI', url: 'https://importai.substack.com/feed', niche: 'ai' },
  { name: 'DeepLearning.AI', url: 'https://www.deeplearning.ai/feed/', niche: 'ai' },

  // Webdev
  { name: 'CSS Tricks', url: 'https://css-tricks.com/feed/', niche: 'webdev' },
  { name: 'Josh Comeau', url: 'https://www.joshwcomeau.com/rss.xml', niche: 'webdev' },
  { name: 'JavaScript Weekly', url: 'https://javascriptweekly.com/rss/', niche: 'webdev' },
  { name: 'Frontend Focus', url: 'https://frontendfoc.us/rss/', niche: 'webdev' },
  { name: 'Web.dev', url: 'https://web.dev/feed.xml', niche: 'webdev' },
  { name: 'The New Stack', url: 'https://thenewstack.io/feed/', niche: 'webdev' },

  // Devtools
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', niche: 'devtools' },
  { name: 'VS Code', url: 'https://code.visualstudio.com/feed.xml', niche: 'devtools' },
  { name: 'Changelog', url: 'https://changelog.com/feed', niche: 'devtools' },
  { name: 'Dev Hints', url: 'https://devhints.io/feed.xml', niche: 'devtools' },
  { name: 'GitLab', url: 'https://about.gitlab.com/atom.xml', niche: 'devtools' },

  // Startup
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', niche: 'startup' },
  { name: 'Y Combinator', url: 'https://www.ycombinator.com/blog/rss', niche: 'startup' },
  { name: 'Mark Suster', url: 'https://bothsidesofthetable.com/feed', niche: 'startup' },
  { name: 'VentureBeat', url: 'https://feeds.feedburner.com/venturebeat/SZYF', niche: 'startup' },
  { name: 'Sifted', url: 'https://sifted.eu/feed', niche: 'startup' },

  // Security
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', niche: 'security' },
  { name: 'The Hackers News', url: 'https://feeds.feedburner.com/TheHackersNews', niche: 'security' },
  { name: 'Bruce Schneier', url: 'https://www.schneier.com/feed/atom/', niche: 'security' },
  { name: 'PortSwigger Daily Swig', url: 'https://portswigger.net/daily-swig/rss', niche: 'security' },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', niche: 'security' },

  // Data
  { name: 'Databricks', url: 'https://databricks.com/feed', niche: 'data' },
  { name: 'Facebook Engineering', url: 'https://engineering.fb.com/feed/', niche: 'data' },
  { name: 'Netflix Tech Blog', url: 'https://netflixtechblog.com/feed', niche: 'data' },
  { name: 'Yelp Engineering', url: 'https://engineeringblog.yelp.com/feed.xml', niche: 'data' },
  { name: 'Towards Data Science', url: 'https://medium.com/feed/towards-data-science', niche: 'data' },

  // Systems
  { name: 'Martin Fowler', url: 'https://martinfowler.com/feed.atom', niche: 'systems' },
  { name: 'High Scalability', url: 'https://highscalability.com/rss/', niche: 'systems' },
  { name: 'Pragmatic Engineer', url: 'https://newsletter.pragmaticengineer.com/feed', niche: 'systems' },
  { name: 'All Things Distributed', url: 'https://www.allthingsdistributed.com/atom.xml', niche: 'systems' },

  // Mobile
  { name: 'Apple Developer News', url: 'https://developer.apple.com/news/rss/news.rss', niche: 'mobile' },
  { name: 'Android Developers Blog', url: 'https://android-developers.googleblog.com/feeds/posts/default', niche: 'mobile' },
  { name: 'React Native', url: 'https://reactnative.dev/blog/rss.xml', niche: 'mobile' },

  // Opensource
  { name: 'GitHub Blog Open Source', url: 'https://github.blog/category/open-source/feed/', niche: 'opensource' },
  { name: 'Opensource.com', url: 'https://opensource.com/feed', niche: 'opensource' },

  // Career
  { name: 'Lethain Engineering', url: 'https://lethain.com/feeds/', niche: 'career' },
  { name: 'Charity Majors Blog', url: 'https://charity.wtf/feed/', niche: 'career' },
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
