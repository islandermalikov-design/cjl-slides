#!/usr/bin/env bash
# Резервная копия PostgreSQL (custom format, сжатая). Хранит последние N копий.
# Использование: ./scripts/backup.sh            (DATABASE_URL из .env)
#                BACKUP_KEEP=30 ./scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${DATABASE_URL:-}" && -f .env ]]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)"
fi
: "${DATABASE_URL:?DATABASE_URL не задан}"
KEEP="${BACKUP_KEEP:-14}"
DIR="${BACKUP_DIR:-backups}"
mkdir -p "$DIR"
chmod 700 "$DIR"
FILE="$DIR/leadflow-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$FILE"
chmod 600 "$FILE"
echo "Резервная копия: $FILE ($(du -h "$FILE" | cut -f1))"
ls -1t "$DIR"/leadflow-*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
