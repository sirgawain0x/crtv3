#!/usr/bin/env bash
# Cutover backup gate: dump production, prove the dump, rehearse the restore, record the evidence.
#
# Runs BEFORE any schema change. Every guard below exists because the failure it prevents is silent:
# an unrehearsed dump is not a backup, and a "successful" pg_restore into the wrong database is worse
# than a failed one.
#
# Required environment:
#   PROD_DB_CONN     production connection URI, must carry sslmode=verify-full
#   SCRATCH_DB_CONN  restore target, must be a DIFFERENT database
#   CUTOVER_DIR      this window's directory (created by the window setup)
#
# Usage: bash scripts/cutover-backup-gate.sh
set -euo pipefail
umask 077

: "${PROD_DB_CONN:?set PROD_DB_CONN to the production URI (sslmode=verify-full)}"
: "${SCRATCH_DB_CONN:?set SCRATCH_DB_CONN to a scratch database URI}"
: "${CUTOVER_DIR:?set CUTOVER_DIR to the window directory}"

DUMP="$CUTOVER_DIR/backup.dump"
DUMP_TMP="$CUTOVER_DIR/.backup.dump.tmp"
LIST="$CUTOVER_DIR/backup.list"
RESULT="$CUTOVER_DIR/backup-result.json"

stop() { echo "STOP: $*" >&2; exit 1; }

# The window directory is created here so the caller only has to export its path. umask 077 above
# makes it owner-only; an existing non-empty directory is refused rather than absorbed.
if [ -e "$CUTOVER_DIR" ]; then
  [ -d "$CUTOVER_DIR" ] || stop "$CUTOVER_DIR exists and is not a directory"
  [ -z "$(ls -A "$CUTOVER_DIR")" ] || stop "$CUTOVER_DIR is not empty — use a fresh directory"
else
  mkdir "$CUTOVER_DIR" || stop "cannot create $CUTOVER_DIR"
fi
# Append-only progress record for this window (same file the window setup writes).
step_done() { printf '%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$1" "$2" >> "$CUTOVER_DIR/steps.log"; }

# --- guards -----------------------------------------------------------------
# Parse the query string rather than searching the whole URI: `?sslmode=…` never starts a line.
case "$PROD_DB_CONN" in
  *\?*) query=${PROD_DB_CONN#*\?} ;;
  *)    query='' ;;
esac
# Exactly one sslmode parameter, so a later duplicate cannot weaken the first.
sslmode_count=$(printf '%s' "$query" | tr '&' '\n' | grep -c '^sslmode=' || true)
[ "$sslmode_count" = "1" ] ||
  stop "PROD_DB_CONN must contain exactly one sslmode parameter (found $sslmode_count)"
sslmode_value=$(printf '%s' "$query" | tr '&' '\n' | sed -n 's/^sslmode=//p')
[ "$sslmode_value" = "verify-full" ] ||
  stop "PROD_DB_CONN must use sslmode=verify-full (found '$sslmode_value'); refusing to dump over unverified TLS"

# Scratch must not be the production database.
parse() { python3 - "$1" <<'PY'
import sys
from urllib.parse import urlsplit
u = urlsplit(sys.argv[1])
print(f"{u.hostname or ''}\t{(u.path or '').lstrip('/')}")
PY
}
prod_target=$(parse "$PROD_DB_CONN")
scratch_target=$(parse "$SCRATCH_DB_CONN")
[ "$prod_target" != "$scratch_target" ] || stop "SCRATCH_DB_CONN resolves to the production database ($prod_target)"

# Never overwrite an earlier window's evidence, and clear a failed run's leftovers.
[ ! -e "$DUMP" ] || stop "$DUMP already exists — use a fresh CUTOVER_DIR"
rm -f "$DUMP_TMP"

# Homebrew keeps libpq keg-only, so the client tools exist without being on PATH.
for candidate in /opt/homebrew/opt/libpq/bin /usr/local/opt/libpq/bin; do
  [ -x "$candidate/pg_dump" ] && PATH="$candidate:$PATH" && export PATH && break
done
command -v pg_dump >/dev/null || stop "pg_dump not found (install the postgres client: brew install libpq)"
command -v pg_restore >/dev/null || stop "pg_restore not found (install the postgres client: brew install libpq)"
command -v psql >/dev/null || stop "psql not found (install the postgres client: brew install libpq)"

# --- dump -------------------------------------------------------------------
echo "dumping production (custom format)…"
# Written to a temp path and moved into place only when it parses, so a failed dump cannot leave a
# zero-byte backup.dump that then trips the fresh-directory guard on retry.
if ! pg_dump "$PROD_DB_CONN" --format=custom --no-owner --no-privileges --file "$DUMP_TMP"; then
  rm -f "$DUMP_TMP"; stop "pg_dump failed; nothing recorded"
fi
[ -s "$DUMP_TMP" ] || { rm -f "$DUMP_TMP"; stop "dump file is empty"; }
mv "$DUMP_TMP" "$DUMP"

dump_bytes=$(wc -c < "$DUMP" | tr -d ' ')

# --- prove the archive parses ----------------------------------------------
pg_restore --list "$DUMP" > "$LIST" || stop "pg_restore --list failed; the archive is not readable"
entries=$(grep -c '^[0-9]' "$LIST" || true)
[ "$entries" -gt 50 ] || stop "archive listing has only $entries entries; refusing to call this a backup"

# --- restore rehearsal ------------------------------------------------------
echo "rehearsing restore into the scratch database…"
pg_restore --dbname "$SCRATCH_DB_CONN" --no-owner --no-privileges --clean --if-exists "$DUMP" \
  || stop "restore rehearsal failed; production must not be touched"

# --- prove the rehearsal produced the same catalog --------------------------
prod_rows=$(psql "$PROD_DB_CONN" -Atc "select count(*) from public.video_assets") \
  || stop "cannot count video_assets in production"
scratch_rows=$(psql "$SCRATCH_DB_CONN" -Atc "select count(*) from public.video_assets") \
  || stop "cannot count video_assets in the restored copy"
[ "$prod_rows" = "$scratch_rows" ] \
  || stop "restored copy has $scratch_rows video_assets, production has $prod_rows"

# --- record -----------------------------------------------------------------
# Computed outside the heredoc: nested quotes inside a heredoc substitution are a parsing trap.
scratch_display=$(printf '%s' "$scratch_target" | tr '\t' '/')
cat > "$RESULT" <<JSON
{
  "recorded_at": "$(date -u +%FT%TZ)",
  "dump_bytes": $dump_bytes,
  "archive_entries": $entries,
  "restore": "completed",
  "video_assets": { "production": $prod_rows, "scratch": $scratch_rows },
  "scratch_target": "$scratch_display"
}
JSON

step_done backup "dump_bytes=$dump_bytes entries=$entries video_assets=$prod_rows"
echo "backup gate passed: $dump_bytes bytes, $entries archive entries, $prod_rows video_assets restored"
