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
: "${CATALOG_REFERENCE:?set CATALOG_REFERENCE to the pre-migration catalog snapshot (videos[] with id, asset_id, playback_id)}"

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

# Homebrew keeps libpq keg-only, so the client tools can exist without being on PATH. Only fall back to the
# keg when nothing resolvable is found - an explicitly supplied PATH must win.
if ! command -v pg_dump >/dev/null 2>&1; then
  for candidate in /opt/homebrew/opt/libpq/bin /usr/local/opt/libpq/bin; do
    [ -x "$candidate/pg_dump" ] && PATH="$candidate:$PATH" && export PATH && break
  done
fi
command -v pg_dump >/dev/null || stop "pg_dump not found (install the postgres client: brew install libpq)"
command -v pg_restore >/dev/null || stop "pg_restore not found (install the postgres client: brew install libpq)"
command -v psql >/dev/null || stop "psql not found (install the postgres client: brew install libpq)"

# --- snapshot consistency ----------------------------------------------------
# pg_dump is consistent with itself, but the catalog reference is a separate read. If a row changes between
# the two, a sound restore compares unequal and the gate stops on a phantom drift. The reference and the dump
# must therefore describe the same instant:
#
#   * pause catalog writes for the duration (the default here), or
#   * capture both against one exported snapshot - documented in §1.0, not automated here.
#
# A deploy freeze does not help: it stops deploys, not catalog edits.
[ "${WRITES_PAUSED:-0}" = "1" ] \
  || stop "catalog writes are not paused — capture the reference and the dump against one instant (WRITES_PAUSED=1 once writes are paused, or use the exported-snapshot recipe in §1.0)"

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

# --- pre-migration schema: the backup is taken BEFORE the 11 migrations ---------
# If any of these are already present, the dump was taken after the schema work started and is not the
# pre-migration baseline this window needs.
ledger_tables=$(psql "$SCRATCH_DB_CONN" -Atc "
  select count(*) from information_schema.tables
   where table_schema='public'
     and table_name in ('frameworks_asset_imports','frameworks_vod_access','frameworks_webhook_receipts',
                        'frameworks_stream_event_cursors','frameworks_ready_artifacts','frameworks_stream_replacements')") \
  || stop "cannot inspect the restored schema"
[ "$ledger_tables" = "0" ] \
  || stop "restored copy already has $ledger_tables framework tables — this dump is not pre-migration"

identity_columns=$(psql "$SCRATCH_DB_CONN" -Atc "
  select count(*) from information_schema.columns
   where table_schema='public' and table_name='video_assets'
     and column_name in ('provider','livepeer_asset_id','livepeer_playback_id',
                         'frameworks_asset_id','frameworks_playback_id')") \
  || stop "cannot inspect video_assets columns in the restored copy"
# EXPECTED_COLUMNS is 0 pre-migration and 5 after the migrations; the window sets which phase this is.
expected_columns="${EXPECTED_IDENTITY_COLUMNS:-0}"
[ "$identity_columns" = "$expected_columns" ] \
  || stop "restored video_assets has $identity_columns identity columns, expected $expected_columns for this phase"

# --- row identity: compare against the pre-migration catalog snapshot -----------
# Counts can match while identities moved. Compare id, legacy asset id and playback id per row.
jq -e '.videos | type=="array" and length>0' "$CATALOG_REFERENCE" >/dev/null 2>&1 \
  || stop "CATALOG_REFERENCE is not a catalog snapshot (expected .videos[] with at least one row)"

expected_tsv="$CUTOVER_DIR/catalog-expected.tsv"
actual_tsv="$CUTOVER_DIR/catalog-restored.tsv"
jq -r '.videos[] | [.id, (.asset_id // ""), (.playback_id // "")] | @tsv' "$CATALOG_REFERENCE" \
  | sort -n > "$expected_tsv" || stop "cannot read identifiers from CATALOG_REFERENCE"

bad_ids=$(cut -f1 "$expected_tsv" | grep -cvE '^[0-9]+$' || true)
[ "$bad_ids" = "0" ] || stop "$bad_ids catalog rows have a non-numeric id; refusing to build a query from them"

id_list=$(cut -f1 "$expected_tsv" | paste -sd, -)
psql "$SCRATCH_DB_CONN" -Atc "
  select id, coalesce(asset_id,''), coalesce(playback_id,'')
    from public.video_assets where id in ($id_list) order by id" \
  | sort -n > "$actual_tsv" || stop "cannot read identities from the restored copy"

expected_rows=$(wc -l < "$expected_tsv" | tr -d ' ')
actual_rows=$(wc -l < "$actual_tsv" | tr -d ' ')

if [ "$expected_rows" != "$actual_rows" ]; then
  missing=$(comm -23 "$expected_tsv" "$actual_tsv" | cut -f1 | paste -sd, -)
  stop "restored copy has $actual_rows of $expected_rows catalog rows (missing or changed: $missing)"
fi

if ! diff -q "$expected_tsv" "$actual_tsv" >/dev/null; then
  # Written to a file first: a head-closed pipe inside a command substitution trips `pipefail` and would
  # exit without printing the STOP line — silence on the one path that must explain itself.
  diff "$expected_tsv" "$actual_tsv" > "$CUTOVER_DIR/catalog-diff.txt" 2>&1 || true
  detail=$(grep -E '^[<>]' "$CUTOVER_DIR/catalog-diff.txt" | head -5 | paste -sd';' - 2>/dev/null || true)
  stop "row identities differ between the catalog snapshot and the restored copy: $detail (full diff: $CUTOVER_DIR/catalog-diff.txt)"
fi

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
  "catalog_rows_verified": $actual_rows,
  "catalog_consistency": "writes-paused",
  "pre_migration_schema": { "framework_tables": $ledger_tables, "identity_columns": $identity_columns },
  "scratch_target": "$scratch_display"
}
JSON

step_done backup "dump_bytes=$dump_bytes entries=$entries video_assets=$prod_rows"
echo "backup gate passed: $dump_bytes bytes, $entries archive entries, $prod_rows video_assets restored"
