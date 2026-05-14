import cron from 'node-cron';
import { runClustering } from './workers/clustering';
import { runEmbedder } from './workers/embedder';
import { runLabeler } from './workers/labeler';
import { runRssFetcher } from './workers/rssFetcher';

type Job = {
  name: string;
  task: () => Promise<void>;
};

const running = new Set<string>();

async function runJob(job: Job) {
  if (running.has(job.name)) {
    console.log(`[scheduler] skip ${job.name}: previous run still in progress`);
    return;
  }

  running.add(job.name);
  const start = Date.now();

  try {
    console.log(`[scheduler] start ${job.name}`);
    await job.task();
    const ms = Date.now() - start;
    console.log(`[scheduler] done ${job.name} in ${Math.round(ms / 1000)}s`);
  } catch (error) {
    console.error(
      `[scheduler] failed ${job.name}`,
      error instanceof Error ? error.message : error
    );
  } finally {
    running.delete(job.name);
  }
}

export function startScheduler() {
  // Every 6 hours: rss fetcher
  cron.schedule('0 */6 * * *', () => {
    void runJob({ name: 'rssFetcher', task: runRssFetcher });
  });

  // Every 6 hours, 30 minutes later: embedder
  cron.schedule('30 */6 * * *', () => {
    void runJob({ name: 'embedder', task: runEmbedder });
  });

  // Every 12 hours: clustering
  cron.schedule('0 */12 * * *', () => {
    void runJob({ name: 'clustering', task: runClustering });
  });

  // Every 12 hours, 30 minutes later: labeler
  cron.schedule('30 */12 * * *', () => {
    void runJob({ name: 'labeler', task: runLabeler });
  });

  console.log('[scheduler] started');
  console.log('[scheduler] rssFetcher  -> 0 */6 * * *');
  console.log('[scheduler] embedder    -> 30 */6 * * *');
  console.log('[scheduler] clustering  -> 0 */12 * * *');
  console.log('[scheduler] labeler     -> 30 */12 * * *');
}

if (require.main === module) {
  startScheduler();
}
