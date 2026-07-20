#!/usr/bin/env bash
set -euo pipefail

# Run backend ingestion workers in sequence.
# Expects DATABASE_URL to be set in environment (include ?sslmode=require when needed).

cd "$(dirname "$0")"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Exiting."
  exit 1
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting worker run"

echo "-> fetch:rss"
DATABASE_URL="$DATABASE_URL" npm run fetch:rss || echo "fetch:rss failed (continuing)"

echo "-> embed"
DATABASE_URL="$DATABASE_URL" npm run embed || echo "embed failed (continue later; checkpoint saved)"

echo "-> cluster"
DATABASE_URL="$DATABASE_URL" npm run cluster || echo "cluster failed (continuing)"

echo "-> label"
DATABASE_URL="$DATABASE_URL" npm run label || echo "label failed (continuing)"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Worker run complete"

exit 0
