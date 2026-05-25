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
  // Additional sources provided by user
  // AI
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', niche: 'ai' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', niche: 'ai' },
  { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed', niche: 'ai' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', niche: 'ai' },
  { name: 'Reddit MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', niche: 'ai' },
  { name: 'Reddit artificial', url: 'https://www.reddit.com/r/artificial/.rss', niche: 'ai' },
  { name: 'Ars Technica AI', url: 'https://arstechnica.com/tag/ai/feed/', niche: 'ai' },
  { name: 'ZDNet AI', url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml', niche: 'ai' },

  // Webdev
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', niche: 'webdev' },
  { name: 'Dev.to', url: 'https://dev.to/feed', niche: 'webdev' },
  { name: 'Reddit webdev', url: 'https://www.reddit.com/r/webdev/.rss', niche: 'webdev' },
  { name: 'Reddit javascript', url: 'https://www.reddit.com/r/javascript/.rss', niche: 'webdev' },
  { name: 'Codrops', url: 'https://tympanus.net/codrops/feed/', niche: 'webdev' },
  { name: 'SitePoint', url: 'https://www.sitepoint.com/feed/', niche: 'webdev' },
  { name: 'Hongkiat', url: 'https://www.hongkiat.com/blog/feed/', niche: 'webdev' },

  // Devtools
  { name: 'JetBrains Blog', url: 'https://blog.jetbrains.com/feed/', niche: 'devtools' },
  { name: 'Docker Blog', url: 'https://www.docker.com/blog/feed/', niche: 'devtools' },
  { name: 'Stack Overflow Blog', url: 'https://stackoverflow.blog/feed/', niche: 'devtools' },
  { name: 'Reddit devops', url: 'https://www.reddit.com/r/devops/.rss', niche: 'devtools' },
  { name: 'Reddit programming', url: 'https://www.reddit.com/r/programming/.rss', niche: 'devtools' },
  { name: 'Hacker News (hnrss)', url: 'https://hnrss.org/frontpage', niche: 'devtools' },

  // Startup
  { name: 'Product Hunt', url: 'https://www.producthunt.com/feed', niche: 'startup' },
  { name: 'First Round Review', url: 'https://review.firstround.com/feed.xml', niche: 'startup' },
  { name: 'A16z Blog', url: 'https://a16z.com/feed/', niche: 'startup' },
  { name: 'Reddit startups', url: 'https://www.reddit.com/r/startups/.rss', niche: 'startup' },
  { name: 'Reddit Entrepreneur', url: 'https://www.reddit.com/r/Entrepreneur/.rss', niche: 'startup' },
  { name: 'Indie Hackers', url: 'https://www.indiehackers.com/feed.xml', niche: 'startup' },
  { name: 'Paul Graham Essays', url: 'http://www.paulgraham.com/rss.html', niche: 'startup' },
  { name: 'StrictlyVC', url: 'https://strictlyvc.com/feed/', niche: 'startup' },

  // Security
  { name: 'Bleeping Computer', url: 'https://www.bleepingcomputer.com/feed/', niche: 'security' },
  { name: 'SANS Stormcast', url: 'https://isc.sans.edu/rssfeed.xml', niche: 'security' },
  { name: 'Reddit netsec', url: 'https://www.reddit.com/r/netsec/.rss', niche: 'security' },
  { name: 'Threatpost', url: 'https://threatpost.com/feed/', niche: 'security' },
  { name: 'Naked Security', url: 'https://nakedsecurity.sophos.com/feed/', niche: 'security' },
  { name: 'Graham Cluley', url: 'https://grahamcluley.com/feed/', niche: 'security' },
  { name: 'Security Weekly', url: 'https://securityweekly.com/feed/', niche: 'security' },

  // Data
  { name: 'Reddit datascience', url: 'https://www.reddit.com/r/datascience/.rss', niche: 'data' },
  { name: 'KDnuggets', url: 'https://www.kdnuggets.com/feed', niche: 'data' },
  { name: 'Data Elixir', url: 'https://dataelixir.com/feed.xml', niche: 'data' },
  { name: 'Towards AI', url: 'https://towardsai.net/feed', niche: 'data' },
  { name: 'Analytics Vidhya', url: 'https://www.analyticsvidhya.com/feed/', niche: 'data' },

  // System Design
  { name: 'ByteByteGo', url: 'https://blog.bytebytego.com/feed', niche: 'systems' },
  { name: 'The System Design Newsletter', url: 'https://newsletter.systemdesign.one/feed', niche: 'systems' },
  { name: 'Engineering at Meta', url: 'https://engineering.fb.com/feed/', niche: 'systems' },
  { name: 'Uber Engineering', url: 'https://eng.uber.com/feed/', niche: 'systems' },
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/', niche: 'systems' },
  { name: 'Discord Engineering', url: 'https://discord.com/blog/engineering-and-games/rss.xml', niche: 'systems' },
  { name: 'Reddit ExperiencedDevs', url: 'https://www.reddit.com/r/ExperiencedDevs/.rss', niche: 'systems' },

  // ML Research
  { name: 'Papers with Code', url: 'https://paperswithcode.com/rss.xml', niche: 'ml-research' },
  { name: 'Sebastian Raschka', url: 'https://magazine.sebastianraschka.com/feed', niche: 'ml-research' },
  { name: 'Andrej Karpathy', url: 'https://karpathy.github.io/feed.xml', niche: 'ml-research' },
  { name: 'Google AI Blog', url: 'https://ai.googleblog.com/feeds/posts/default', niche: 'ml-research' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss/', niche: 'ml-research' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/blog/rss', niche: 'ml-research' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss/', niche: 'ml-research' },

  // DevOps
  { name: 'Last Week in AWS', url: 'https://www.lastweekinaws.com/feed/', niche: 'devops' },
  { name: 'DevOps.com', url: 'https://devops.com/feed/', niche: 'devops' },
  { name: 'DZone DevOps', url: 'https://dzone.com/devops-tutorials-tools-news/list.rss', niche: 'devops' },
  { name: 'Reddit kubernetes', url: 'https://www.reddit.com/r/kubernetes/.rss', niche: 'devops' },
  { name: 'AWS Blog', url: 'https://aws.amazon.com/blogs/aws/feed/', niche: 'devops' },
  { name: 'Google Cloud Blog', url: 'https://cloud.google.com/blog/rss', niche: 'devops' },
  { name: 'Azure Blog', url: 'https://azure.microsoft.com/en-us/blog/feed/', niche: 'devops' },

  // Web3
  { name: 'Vitalik Buterin', url: 'https://vitalik.eth.limo/feed.xml', niche: 'web3' },
  { name: 'Bankless', url: 'https://banklesshq.com/rss', niche: 'web3' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed', niche: 'web3' },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', niche: 'web3' },
  { name: 'The Defiant', url: 'https://thedefiant.io/feed', niche: 'web3' },
  { name: 'Reddit ethereum', url: 'https://www.reddit.com/r/ethereum/.rss', niche: 'web3' },

  // Product
  { name: "Lenny's Newsletter", url: 'https://www.lennysnewsletter.com/feed', niche: 'product' },
  { name: 'Linear Blog', url: 'https://linear.app/blog/rss', niche: 'product' },
  { name: 'Figma Blog', url: 'https://www.figma.com/blog/rss/', niche: 'product' },
  { name: 'Inside Intercom', url: 'https://www.intercom.com/blog/feed', niche: 'product' },
  { name: 'Mind the Product', url: 'https://www.mindtheproduct.com/feed/', niche: 'product' },
  { name: 'Reddit ProductManagement', url: 'https://www.reddit.com/r/ProductManagement/.rss', niche: 'product' },
  { name: 'Gibson Biddle', url: 'https://gibsonbiddle.medium.com/feed', niche: 'product' },
  { name: 'Reforge Blog', url: 'https://www.reforge.com/blog/rss', niche: 'product' },
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
      try {
        await query(
          `INSERT INTO sources (name, url, niche)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE
           SET url = EXCLUDED.url,
               niche = EXCLUDED.niche`,
          [source.name, source.url, source.niche]
        );
      } catch (err) {
        // Handle duplicate-url case where another source row already owns this URL
        // In that case update the existing row to ensure niche/name are in sync.
        try {
          await query(
            `UPDATE sources SET name = $1, niche = $3 WHERE url = $2`,
            [source.name, source.url, source.niche]
          );
        } catch (uErr) {
          console.error('failed to upsert source by url', source, uErr);
        }
      }
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
