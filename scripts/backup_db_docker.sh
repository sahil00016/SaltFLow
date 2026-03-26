#!/usr/bin/env bash
# =============================================================================
# SaltFlow — PostgreSQL Backup (Docker version)
# Use this when the DB runs inside Docker Compose (the default setup).
# =============================================================================
# Usage:
#   ./scripts/backup_db_docker.sh
#
# Cron (daily at 2 AM):
#   0 2 * * * /home/sahilsonker/SaltFLow/scripts/backup_db_docker.sh >> /home/sahilsonker/SaltFLow/backups/backup.log 2>&1
# =============================================================================

set -euo pipefail

COMPOSE_FILE="$(dirname "$0")/../docker-compose.yml"
BACKUP_DIR="$(dirname "$0")/../backups"
DATE=$(date +"%Y_%m_%d")
FILENAME="backup_${DATE}.sql"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [saltflow-backup]"

BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd)
FILEPATH="${BACKUP_DIR}/${FILENAME}"

if ! command -v docker &>/dev/null; then
  echo "${LOG_PREFIX} ERROR: docker not found." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

if [[ -f "$FILEPATH" ]]; then
  echo "${LOG_PREFIX} SKIP: Backup already exists for today: ${FILENAME}"
  exit 0
fi

# Find the running DB container from the compose project
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db 2>/dev/null || true)

if [[ -z "$DB_CONTAINER" ]]; then
  echo "${LOG_PREFIX} ERROR: DB container is not running. Start it with: docker compose up -d db" >&2
  exit 1
fi

echo "${LOG_PREFIX} Starting backup from container ${DB_CONTAINER} → ${FILEPATH}"

if docker exec "$DB_CONTAINER" \
    pg_dump \
    --username=saltflow \
    --dbname=saltflow \
    --format=plain \
    --encoding=UTF8 \
    > "$FILEPATH"; then

  SIZE=$(du -sh "$FILEPATH" | cut -f1)
  echo "${LOG_PREFIX} SUCCESS: ${FILENAME} (${SIZE})"
else
  rm -f "$FILEPATH"
  echo "${LOG_PREFIX} ERROR: pg_dump failed inside container. Partial file removed." >&2
  exit 1
fi

# Retention: delete backups older than 30 days
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -name "backup_*.sql" -mtime +30 -print -delete | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
  echo "${LOG_PREFIX} Cleaned up ${DELETED} backup(s) older than 30 days"
fi
