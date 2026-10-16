#!/usr/bin/env bash
# Восстановление из резервной копии. ВНИМАНИЕ: перезаписывает данные в целевой БД.
# Использование: ./scripts/restore.sh backups/leadflow-YYYYMMDD-HHMMSS.dump
set -euo pipefail
cd "$(dirname "$0")/.."
FILE="${1:?Укажите файл резервной копии}"
if [[ -z "${DATABASE_URL:-}" && -f .env ]]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)"
fi
: "${DATABASE_URL:?DATABASE_URL не задан}"
read -r -p "Восстановить $FILE в $(echo "$DATABASE_URL" | sed -E 's#//[^@]*@#//***@#')? Данные будут перезаписаны [y/N] " answer
[[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "Отменено"; exit 1; }
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$FILE"
echo "Восстановлено."
