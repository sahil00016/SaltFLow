#!/usr/bin/env bash
# =============================================================================
# SaltFlow — PostgreSQL Restore Script
# =============================================================================
# Usage:
#   ./scripts/restore_db.sh backups/backup_2026_03_26.sql
# =============================================================================

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-saltflow}"
DB_USER="${DB_USER:-saltflow}"
DB_PASSWORD="${DB_PASSWORD:-radhey12345}"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [saltflow-restore]"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup_file.sql>"
  echo "Example: $0 backups/backup_2026_03_26.sql"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "${LOG_PREFIX} ERROR: File not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "${LOG_PREFIX} WARNING: This will REPLACE all data in '${DB_NAME}' with the backup."
read -rp "Type 'yes' to confirm: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "${LOG_PREFIX} Restore cancelled."
  exit 0
fi

echo "${LOG_PREFIX} Restoring from ${BACKUP_FILE} …"

export PGPASSWORD="$DB_PASSWORD"

# Drop and recreate the database, then restore
psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="postgres" \
  --no-password \
  -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
  -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-password \
  < "$BACKUP_FILE"

unset PGPASSWORD

echo "${LOG_PREFIX} SUCCESS: Restore complete."
