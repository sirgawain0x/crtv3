#!/usr/bin/env bash
# Cutover backup gate: dump production, prove the dump, rehearse the restore, verify the catalog.
#
# Runs BEFORE any schema change. Every guard exists because the failure it prevents is silent: an
# unrehearsed dump is not a backup, and a "successful" pg_restore into the wrong database is worse than
# a failed one.
#
# Required environment:
#   PROD_DB_CONN         production URI, exactly one sslmode=verify-full
#   SCRATCH_DB_CONN      isolated restore target, must not share production's host
#   CUTOVER_DIR          this window's directory (created here, umask 077)
#   EXPECTED_PROD_HOST   the hostname production must resolve to (a URI is not trusted because a name exists)
#
# Consistency mode — one of, never both:
#   CATALOG_SNAPSHOT_MODE=shared  (default) the gate exports one PostgreSQL snapshot, reads the catalog
#                                 reference inside that transaction, and runs pg_dump with --snapshot, so
#                                 both describe the same instant with no write pause at all.
#   CATALOG_SNAPSHOT_MODE=paused  operator paused writes and captured CATALOG_REFERENCE themselves; requires
#                                 WRITES_PAUSED=1 plus the drift re-read and the write sampler.
#
# Usage: bash scripts/cutover-backup-gate.sh
set -euo pipefail
umask 077

: "${PROD_DB_CONN:?set PROD_DB_CONN to the production URI (sslmode=verify-full)}"
: "${SCRATCH_DB_CONN:?set SCRATCH_DB_CONN to an isolated scratch database URI}"
: "${CUTOVER_DIR:?set CUTOVER_DIR to the window directory}"
: "${EXPECTED_PROD_HOST:?set EXPECTED_PROD_HOST to the hostname production must resolve to}"

MODE="${CATALOG_SNAPSHOT_MODE:-shared}"
DUMP="$CUTOVER_DIR/backup.dump"
DUMP_TMP="$CUTOVER_DIR/.backup.dump.tmp"
LIST="$CUTOVER_DIR/backup.list"
RESULT="$CUTOVER_DIR/backup-result.json"
REFERENCE="$CUTOVER_DIR/catalog-before-migration.tsv"

stop() { echo "STOP: $*" >&2; exit 1; }
step_done() { printf '%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$1" "$2" >> "$CUTOVER_DIR/steps.log"; }

# The window directory is created here so the caller only exports its path. umask 077 makes it owner-only;
# an existing non-empty directory is refused rather than absorbed.
if [ -e "$CUTOVER_DIR" ]; then
  [ -d "$CUTOVER_DIR" ] || stop "$CUTOVER_DIR exists and is not a directory"
  [ -z "$(ls -A "$CUTOVER_DIR")" ] || stop "$CUTOVER_DIR is not empty — use a fresh directory"
else
  mkdir "$CUTOVER_DIR" || stop "cannot create $CUTOVER_DIR"
fi

# --- mode and connection guards ---------------------------------------------
case "$MODE" in shared|paused) ;; *) stop "CATALOG_SNAPSHOT_MODE must be 'shared' or 'paused' (got '$MODE')" ;; esac
if [ "$MODE" = "paused" ]; then
  [ "${WRITES_PAUSED:-0}" = "1" ] || stop "paused mode requires WRITES_PAUSED=1, set only after writes are actually paused"
else
  [ "${WRITES_PAUSED:-0}" = "1" ] && stop "shared-snapshot mode needs no write pause; unset WRITES_PAUSED (contradictory configuration)"
fi

# Parse the query string rather than searching the whole URI: `?sslmode=…` never starts a line.
case "$PROD_DB_CONN" in
  *\?*) query=${PROD_DB_CONN#*\?} ;;
  *)    query='' ;;
esac
sslmode_count=$(printf '%s' "$query" | tr '&' '\n' | grep -c '^sslmode=' || true)
[ "$sslmode_count" = "1" ] || stop "PROD_DB_CONN must contain exactly one sslmode parameter (found $sslmode_count)"
sslmode_value=$(printf '%s' "$query" | tr '&' '\n' | sed -n 's/^sslmode=//p')
[ "$sslmode_value" = "verify-full" ] || stop "PROD_DB_CONN must use sslmode=verify-full (found '$sslmode_value'); refusing to dump over unverified TLS"

parse() { python3 - "$1" <<'PY'
import sys
from urllib.parse import urlsplit
u = urlsplit(sys.argv[1])
port = u.port or 5432
print(f"{u.hostname or ''}\t{port}\t{(u.path or '').lstrip('/')}")
PY
}
prod_target=$(parse "$PROD_DB_CONN")
scratch_target=$(parse "$SCRATCH_DB_CONN")
prod_host=$(printf '%s' "$prod_target" | cut -f1)
prod_port=$(printf '%s' "$prod_target" | cut -f2)
prod_db=$(printf '%s' "$prod_target" | cut -f3)
scratch_host=$(printf '%s' "$scratch_target" | cut -f1)
scratch_port=$(printf '%s' "$scratch_target" | cut -f2)
scratch_db=$(printf '%s' "$scratch_target" | cut -f3)

[ -n "$prod_host" ] && [ -n "$prod_db" ] || stop "PROD_DB_CONN does not parse to a host and database"
[ "$prod_host" = "$EXPECTED_PROD_HOST" ] || stop "PROD_DB_CONN points at '$prod_host', expected '$EXPECTED_PROD_HOST'"
# Same host AND port is the same server: a --clean restore there can interfere with production even into
# another database. A different port is a different instance and is acceptable (the local rehearsal case).
[ "$scratch_host:$scratch_port" != "$prod_host:$prod_port" ] \
  || stop "SCRATCH_DB_CONN points at the production server ($prod_host:$prod_port); use a separate instance"

[ ! -e "$DUMP" ] || stop "$DUMP already exists — use a fresh CUTOVER_DIR"
rm -f "$DUMP_TMP"

# Homebrew keeps libpq keg-only; only fall back to the keg when nothing resolvable is on PATH.
if ! command -v pg_dump >/dev/null 2>&1; then
  for candidate in /opt/homebrew/opt/libpq/bin /usr/local/opt/libpq/bin; do
    [ -x "$candidate/pg_dump" ] && PATH="$candidate:$PATH" && export PATH && break
  done
fi
for tool in pg_dump pg_restore psql; do
  command -v "$tool" >/dev/null || stop "$tool not found (install the postgres client: brew install libpq)"
done

# --- the scratch instance must be empty -------------------------------------
scratch_tables=$(psql "$SCRATCH_DB_CONN" -Atc "
  select count(*) from information_schema.tables
   where table_schema not in ('pg_catalog','information_schema')") || stop "cannot inspect the scratch database"
[ "$scratch_tables" = "0" ] || stop "scratch database already has $scratch_tables user tables; the restore must land in an empty instance"

# --- capture reference and dump against one instant -------------------------
if [ "$MODE" = "shared" ]; then
  session_log="$CUTOVER_DIR/snapshot-session.log"
  : > "$session_log"
  fifo="$CUTOVER_DIR/.session.fifo"
  rm -f "$fifo"; mkfifo "$fifo"
  psql "$PROD_DB_CONN" -X -q -A -t -v ON_ERROR_STOP=1 -f "$fifo" >> "$session_log" 2>&1 &
  session_pid=$!
  exec 3>"$fifo"

  printf 'BEGIN ISOLATION LEVEL REPEATABLE READ;\nSELECT pg_export_snapshot();\n' >&3
  snapshot_id=""
  for _ in $(seq 1 150); do
    snapshot_id=$(grep -E '^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$' "$session_log" | head -1 || true)
    [ -n "$snapshot_id" ] && break
    sleep 0.2
  done
  if [ -z "$snapshot_id" ]; then
    exec 3>&-; kill "$session_pid" 2>/dev/null || true; rm -f "$fifo"
    stop "could not export a snapshot from production (see $session_log)"
  fi
  echo "exported snapshot $snapshot_id"

  # Read inside the same transaction, so the reference and the dump share the snapshot. Written via \o with an
  # explicit tab separator: \copy's text format did not emit the delimiter this comparison expects.
  printf "\\pset format unaligned\n\\pset tuples_only on\n\\pset fieldsep '\\t'\n\\o %s\nselect id, coalesce(asset_id,''), coalesce(playback_id,'') from public.video_assets order by id;\n\\o\n" "$REFERENCE" >&3

  echo "dumping production against the exported snapshot…"
  if ! pg_dump "$PROD_DB_CONN" --snapshot="$snapshot_id" --format=custom --no-owner --no-privileges --file "$DUMP_TMP"; then
    printf 'ROLLBACK;\n\\q\n' >&3; exec 3>&-; wait "$session_pid" 2>/dev/null || true; rm -f "$fifo"
    rm -f "$DUMP_TMP"; stop "pg_dump failed; nothing recorded"
  fi

  printf 'COMMIT;\n\\q\n' >&3
  exec 3>&-; rm -f "$fifo"
  wait "$session_pid" || stop "snapshot session did not close cleanly (see $session_log)"
  consistency="shared-snapshot $snapshot_id: reference and dump read from one transaction"
else
  : "${CATALOG_REFERENCE:?paused mode requires CATALOG_REFERENCE captured from production before the dump}"
  [ -s "$CATALOG_REFERENCE" ] || stop "CATALOG_REFERENCE is empty or missing"
  jq -e '.videos | type=="array" and length>0' "$CATALOG_REFERENCE" >/dev/null 2>&1 \
    || stop "CATALOG_REFERENCE is not a catalog snapshot (.videos[] expected)"
  jq -r '.videos[] | [.id, (.asset_id // ""), (.playback_id // "")] | @tsv' "$CATALOG_REFERENCE" \
    | sort -n > "$REFERENCE" || stop "cannot read identifiers from CATALOG_REFERENCE"

  # Detector, not guarantee: a sub-second write can fall between samples.
  writes_log="$CUTOVER_DIR/writes-during-dump.log"
  ( while :; do
      psql "$PROD_DB_CONN" -Atc "select count(*) from pg_stat_activity
        where pid <> pg_backend_pid() and state = 'active'
          and query ~* '\\m(insert|update|delete|merge)\\M' and query ilike '%video_assets%'" 2>/dev/null || echo 0
      sleep 1
    done ) > "$writes_log" &
  sampler_pid=$!

  echo "dumping production (custom format)…"
  if ! pg_dump "$PROD_DB_CONN" --format=custom --no-owner --no-privileges --file "$DUMP_TMP"; then
    kill "$sampler_pid" 2>/dev/null || true; rm -f "$DUMP_TMP"; stop "pg_dump failed; nothing recorded"
  fi
  kill "$sampler_pid" 2>/dev/null || true; wait "$sampler_pid" 2>/dev/null || true

  if [ -s "$writes_log" ] && grep -qvE '^0[[:space:]]*$' "$writes_log"; then
    observed=$(grep -vcE '^0[[:space:]]*$' "$writes_log" || true)
    rm -f "$DUMP_TMP"
    stop "write activity against video_assets observed during the dump ($observed samples > 0; $writes_log) — the pause was not effective"
  fi

  # Net-change check: identical identities before and after shows the pause held for these fields.
  post_dump="$CUTOVER_DIR/catalog-after-dump.tsv"
  psql "$PROD_DB_CONN" -At -F $'\t' -c "select id, coalesce(asset_id,''), coalesce(playback_id,'') from public.video_assets order by id" \
    | sort -n > "$post_dump" || stop "cannot re-read the catalog from production"
  if ! diff -q "$REFERENCE" "$post_dump" >/dev/null; then
    diff "$REFERENCE" "$post_dump" > "$CUTOVER_DIR/catalog-moved-during-capture.txt" 2>&1 || true
    moved=$(grep -E '^[<>]' "$CUTOVER_DIR/catalog-moved-during-capture.txt" | head -5 | paste -sd';' - 2>/dev/null || true)
    rm -f "$DUMP_TMP"
    stop "catalog identities changed while the reference and dump were captured: $moved — the pause was not real; use shared-snapshot mode"
  fi
  consistency="paused writes (asserted) — no write statements observed, identities unchanged before/after"
fi

[ -s "$DUMP_TMP" ] || { rm -f "$DUMP_TMP"; stop "dump file is empty"; }
mv "$DUMP_TMP" "$DUMP"
dump_bytes=$(wc -c < "$DUMP" | tr -d ' ')

# --- prove the archive parses ----------------------------------------------
pg_restore --list "$DUMP" > "$LIST" || stop "pg_restore --list failed; the archive is not readable"
entries=$(grep -c '^[0-9]' "$LIST" || true)
[ "$entries" -gt 0 ] || stop "archive listing is empty; the dump is not a backup"
# A count floor is arbitrary across database sizes. The archive must contain the data for the table the
# cutover depends on, which is the property that actually matters.
grep -qE 'TABLE DATA public video_assets' "$LIST" \
  || stop "archive does not contain TABLE DATA for public.video_assets; refusing to call this a backup"

# --- restore rehearsal ------------------------------------------------------
echo "rehearsing restore into the scratch database…"
pg_restore --dbname "$SCRATCH_DB_CONN" --no-owner --no-privileges --clean --if-exists "$DUMP" \
  || stop "restore rehearsal failed; production must not be touched"

prod_rows=$(psql "$PROD_DB_CONN" -Atc "select count(*) from public.video_assets") || stop "cannot count video_assets in production"
scratch_rows=$(psql "$SCRATCH_DB_CONN" -Atc "select count(*) from public.video_assets") || stop "cannot count video_assets in the restored copy"
[ "$prod_rows" = "$scratch_rows" ] || stop "restored copy has $scratch_rows video_assets, production has $prod_rows"

# --- pre-migration schema shape --------------------------------------------
ledger_tables=$(psql "$SCRATCH_DB_CONN" -Atc "
  select count(*) from information_schema.tables
   where table_schema='public'
     and table_name in ('frameworks_asset_imports','frameworks_vod_access','frameworks_webhook_receipts',
                        'frameworks_stream_event_cursors','frameworks_ready_artifacts','frameworks_stream_replacements')") \
  || stop "cannot inspect the restored schema"
[ "$ledger_tables" = "0" ] || stop "restored copy already has $ledger_tables framework tables — this dump is not pre-migration"

identity_columns=$(psql "$SCRATCH_DB_CONN" -Atc "
  select count(*) from information_schema.columns
   where table_schema='public' and table_name='video_assets'
     and column_name in ('provider','livepeer_asset_id','livepeer_playback_id','frameworks_asset_id','frameworks_playback_id')") \
  || stop "cannot inspect video_assets columns in the restored copy"
expected_columns="${EXPECTED_IDENTITY_COLUMNS:-0}"
[ "$identity_columns" = "$expected_columns" ] \
  || stop "restored video_assets has $identity_columns identity columns, expected $expected_columns for this phase"

# --- row identity against the same snapshot the dump used -------------------
expected_rows=$(wc -l < "$REFERENCE" | tr -d ' ')
[ "$expected_rows" -gt 0 ] || stop "the catalog reference is empty; nothing to verify"

actual_tsv="$CUTOVER_DIR/catalog-restored.tsv"
psql "$SCRATCH_DB_CONN" -At -F $'\t' -c "select id, coalesce(asset_id,''), coalesce(playback_id,'') from public.video_assets order by id" \
  | sort -n > "$actual_tsv" || stop "cannot read identities from the restored copy"

actual_rows=$(wc -l < "$actual_tsv" | tr -d ' ')
if [ "$expected_rows" != "$actual_rows" ]; then
  missing=$(comm -23 "$REFERENCE" "$actual_tsv" | cut -f1 | paste -sd, -)
  stop "restored copy has $actual_rows of $expected_rows catalog rows (missing or changed: $missing)"
fi
if ! diff -q "$REFERENCE" "$actual_tsv" >/dev/null; then
  diff "$REFERENCE" "$actual_tsv" > "$CUTOVER_DIR/catalog-diff.txt" 2>&1 || true
  detail=$(grep -E '^[<>]' "$CUTOVER_DIR/catalog-diff.txt" | head -5 | paste -sd';' - 2>/dev/null || true)
  stop "row identities differ between the reference and the restored copy: $detail (full diff: $CUTOVER_DIR/catalog-diff.txt)"
fi

# --- record -----------------------------------------------------------------
scratch_display=$(printf '%s' "$scratch_target" | tr '\t' '/')
cat > "$RESULT" <<JSON
{
  "recorded_at": "$(date -u +%FT%TZ)",
  "mode": "$MODE",
  "consistency": "$consistency",
  "dump_bytes": $dump_bytes,
  "archive_entries": $entries,
  "restore": "completed",
  "video_assets": { "production": $prod_rows, "scratch": $scratch_rows },
  "catalog_rows_verified": $actual_rows,
  "pre_migration_schema": { "framework_tables": $ledger_tables, "identity_columns": $identity_columns },
  "scratch_target": "$scratch_display"
}
JSON

step_done backup "mode=$MODE dump_bytes=$dump_bytes entries=$entries video_assets=$prod_rows identities=$actual_rows"
echo "backup gate passed: $dump_bytes bytes, $entries archive entries, $prod_rows video_assets, $actual_rows identities verified ($MODE)"
