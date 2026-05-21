CREATE TABLE IF NOT EXISTS worker_logs (
  id BIGSERIAL PRIMARY KEY,
  worker_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_logs_worker_name_created_at
  ON worker_logs (worker_name, created_at DESC);
