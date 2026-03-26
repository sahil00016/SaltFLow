#!/usr/bin/env bash
# =============================================================================
# SaltFlow — PostgreSQL Backup Script
# =============================================================================
# Usage:
#   ./scripts/backup_db.sh                      # uses defaults from this file
#   DB_PASSWORD=secret ./scripts/backup_db.sh   # override any variable
#
# Cron (daily at 2 AM):
#   0 2 * * * /home/sahilsonker/SaltFLow/scripts/backup_db.sh >> /home/sahilsonker/SaltFLow/backups/backup.log 2>&1
# =============================================================================

set -euo pipefail

# ── Configuration (override with env vars) ───────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-saltflow}"
DB_USER="${DB_USER:-saltflow}"
DB_PASSWORD="${DB_PASSWORD:-radhey12345}"

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
DATE=$(date +"%Y_%m_%d")
FILENAME="backup_${DATE}.sql"
FILEPATH="${BACKUP_DIR}/${FILENAME}"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [saltflow-backup]"

# ── Resolve absolute path ─────────────────────────────────────────────────────
BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd)
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if ! command -v pg_dump &>/dev/null; then
  echo "${LOG_PREFIX} ERROR: pg_dump not found. Install postgresql-client." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

if [[ -f "$FILEPATH" ]]; then
  echo "${LOG_PREFIX} SKIP: Backup already exists for today: ${FILENAME}"
  exit 0
fi

# ── Run backup ────────────────────────────────────────────────────────────────
echo "${LOG_PREFIX} Starting backup → ${FILEPATH}"

export PGPASSWORD="$DB_PASSWORD"

if pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-password \
    --format=plain \
    --encoding=UTF8 \
    > "$FILEPATH"; then

  SIZE=$(du -sh "$FILEPATH" | cut -f1)
  echo "${LOG_PREFIX} SUCCESS: ${FILENAME} (${SIZE})"
else
  # Remove incomplete file on failure
  rm -f "$FILEPATH"
  echo "${LOG_PREFIX} ERROR: pg_dump failed. Partial file removed." >&2
  exit 1
fi

unset PGPASSWORD

# ── Retention: delete backups older than 30 days ─────────────────────────────
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -name "backup_*.sql" -mtime +30 -print -delete | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
  echo "${LOG_PREFIX} Cleaned up ${DELETED} backup(s) older than 30 days"
fi
