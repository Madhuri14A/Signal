import { query } from './index';

export type WorkerRunStatus = 'success' | 'failure';

type WorkerLogInput = {
  workerName: string;
  status: WorkerRunStatus;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  message?: string | null;
};

export async function logWorkerRun(input: WorkerLogInput): Promise<void> {
  try {
    await query(
      `INSERT INTO worker_logs (
        worker_name,
        status,
        started_at,
        finished_at,
        duration_ms,
        message
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.workerName,
        input.status,
        input.startedAt,
        input.finishedAt,
        input.durationMs,
        input.message ?? null,
      ]
    );
  } catch (error) {
    console.error(
      '[worker_logs] failed to write log',
      error instanceof Error ? error.message : error
    );
  }
}
