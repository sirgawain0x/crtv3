# Production: FrameWorks schema, mapping copy, and remap dry run

**TL;DR** Production has no FrameWorks import ledger, so the remap cannot run there. Three steps, in
order: apply the nine-migration set, copy the verified mappings from QA, then dry-run the remap and expect
**25 identity updates, 3 named exceptions, 0 blockers**. Nothing in this document has been executed
against production — no production credential exists in the environment that wrote it.

**The QA derivative migration is not part of this path.** Recovery of Monster, Friends and Tulleti –
Brutality happens later by re-upload, tracked separately.

## Production identity is pinned in code, not in an environment variable

`lib/video-provider/migration/import-mapping-copy.ts` already pins both endpoints:

| role | project | constant |
| --- | --- | --- |
| source (QA ledger) | `zxpobpucayevlrzdxhmr` | `QA_FRAMEWORKS_SUPABASE_URL` |
| target (production) | **`zdeiezfoemibjgrkyzvs`** | `PROD_FRAMEWORKS_SUPABASE_URL` |

The copy tool refuses any other target. The connection guard below uses the same literal so the DDL path
and the copy path agree on what "production" means.

## §0 Connection guard — before any DDL

```bash
set -euo pipefail

# Pinned in the shell: an operator's stale PROD_REF must never be what gets migrated.
export PROD_REF='zdeiezfoemibjgrkyzvs'

PROD_DB_CONN=$(python3 - "$PROD_DATABASE_URL" "$PROD_REF" <<'PY'
import re, sys, urllib.parse

url, ref = sys.argv[1], sys.argv[2]

def stop(msg):
    print(f"STOP: {msg}", file=sys.stderr)
    sys.exit(1)

u = urllib.parse.urlsplit(url)
if u.scheme not in ("postgres", "postgresql"):
    stop(f"database URL scheme is {u.scheme!r}")

q = urllib.parse.parse_qs(u.query, keep_blank_values=True)
overrides = {"host", "hostaddr", "port", "user", "password", "dbname", "service",
             "servicefile", "passfile", "options", "target_session_attrs"}
hit = sorted(overrides & set(q))
if hit:
    stop(f"connection URI overrides the checked target via {hit}")
unexpected = sorted(set(q) - {"sslmode"})
if unexpected:
    stop(f"unexpected connection parameters {unexpected}")

modes = q.get("sslmode", [])
if len(modes) != 1:
    stop("sslmode must appear exactly once")
if modes[0] != "verify-full":
    stop(f"sslmode must be verify-full (got {modes[0]!r})")

host = (u.hostname or "").lower()
user = u.username or ""
user_ref = user.split(".", 1)[1] if user.startswith("postgres.") else None

if host == f"db.{ref}.supabase.co":
    if user not in ("postgres", f"postgres.{ref}"):
        stop(f"direct host with unexpected user {user!r}")
elif re.fullmatch(r"aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com", host) and user_ref == ref:
    pass
else:
    stop(f"database URL does not target {ref} (host={host!r} user={user!r})")

print(urllib.parse.urlunsplit((u.scheme, u.netloc, u.path or "/postgres", "sslmode=verify-full", "")))
PY
) || exit 1

export PGSSLMODE=verify-full
echo "connection target validated for production (URI query rebuilt from the checked sslmode)"
psql "$PROD_DB_CONN" -Atc "select current_user, current_database(), ssl, version from pg_stat_ssl where pid = pg_backend_pid()"
```

Record the `pg_stat_ssl` row and the successful `verify-full` connection. **Never record `PROD_DB_CONN`**
— it carries the production password.

## §1 What production is missing

```sql
-- Expected before this work: no rows. Any row here means the ledger is already partially present,
-- and the drift comparison below decides what remains.
select table_name from information_schema.tables
 where table_schema='public'
   and table_name in ('frameworks_asset_imports','frameworks_vod_access','frameworks_webhook_receipts',
                      'frameworks_stream_event_cursors','frameworks_ready_artifacts','frameworks_stream_replacements');

-- The remap's guards need these columns; Expected before this work: 0
select count(*) from information_schema.columns
 where table_schema='public' and table_name='video_assets'
   and column_name in ('provider','livepeer_asset_id','livepeer_playback_id',
                       'frameworks_asset_id','frameworks_playback_id');
```

```bash
python3 scripts/generate-migration-drift-sql.py --ref origin/staging > prod-drift.sql
psql "$PROD_DB_CONN" -f prod-drift.sql
```

Two different findings, never merged: **absent from the ledger** (the migration tool has no row) and
**absent from the database** (the object does not exist). A missing ledger row for something that is
present is a history question; a missing object is a blocker.

## §2 Apply the reviewed set, in this order

Eleven migrations. Hash prefixes are generated from the committed files — do not retype them.

```bash
shasum -a 256 supabase/migrations/{20261123051536_frameworks_asset_identity,20261123053537_frameworks_vod_access,20261123054045_frameworks_vod_policy_lock,20261123143443_frameworks_webhook_receipts,20261123144030_frameworks_recording_thumbnail_fallback,20261124051337_frameworks_stream_replacements,20261124170039_frameworks_recording_authority,20261124182327_frameworks_recording_gate_preservation,20261124182629_frameworks_clip_authority,20261124183930_frameworks_import_reconciliation,20261125143000_frameworks_failed_import_retry}.sql
```

| # | migration | sha256 (first 16) | creates |
| --- | --- | --- | --- |
| 1 | `20261123051536_frameworks_asset_identity` | `704153b9fb151980` | `provider`/`livepeer_*`/`frameworks_*` on `video_assets` + `streams`; **`frameworks_asset_imports`** |
| 2 | `20261123053537_frameworks_vod_access` | `b987c5e25666d2e7` | `frameworks_vod_access` |
| 3 | `20261123054045_frameworks_vod_policy_lock` | `14c34d5f5947caf4` | policy lock on access rows |
| 4 | `20261123143443_frameworks_webhook_receipts` | `f9ec0408f9e7715a` | **`frameworks_webhook_receipts`**, `frameworks_stream_event_cursors`, `frameworks_ready_artifacts`, `process_frameworks_webhook()` |
| 5 | `20261123144030_frameworks_recording_thumbnail_fallback` | `6ca079ea6962e86f` | `CREATE OR REPLACE` of `process_frameworks_webhook()` — thumbnail fallback |
| 6 | `20261124051337_frameworks_stream_replacements` | `bd8890cc6b53678d` | **`frameworks_stream_replacements`** |
| 7 | `20261124170039_frameworks_recording_authority` | `0d48b61c4d94ec05` | recording authority |
| 8 | `20261124182327_frameworks_recording_gate_preservation` | `7362cc98492e4c36` | recording gate preservation |
| 9 | `20261124182629_frameworks_clip_authority` | `c8632e5f39a3006a` | clip authority |
| 10 | `20261124183930_frameworks_import_reconciliation` | `3adc0634ad617922` | import reconciliation |
| 11 | `20261125143000_frameworks_failed_import_retry` | `d45b7b5f5683b5ad` | failed-import retry fields |
| — | ~~`20261126093000_frameworks_derivative_recovery`~~ | — | **excluded**: re-upload recovery path, not the release of the 25 |

Three of these are here because production is missing more than the ledger: without
`frameworks_webhook_receipts` and `process_frameworks_webhook()` a delivered webhook cannot be processed
(the ingest check in §5 fails), and without `frameworks_stream_replacements` the existing stream cutover
has no table to write.

Apply **one file per transaction**, so a failure is attributable to exactly one migration:

```bash
for f in 20261123051536_frameworks_asset_identity 20261123053537_frameworks_vod_access 20261123054045_frameworks_vod_policy_lock 20261123143443_frameworks_webhook_receipts 20261123144030_frameworks_recording_thumbnail_fallback 20261124051337_frameworks_stream_replacements 20261124170039_frameworks_recording_authority 20261124182327_frameworks_recording_gate_preservation 20261124182629_frameworks_clip_authority 20261124183930_frameworks_import_reconciliation 20261125143000_frameworks_failed_import_retry; do
  echo "== $f"
  psql "$PROD_DB_CONN" --single-transaction -v ON_ERROR_STOP=1 -f "supabase/migrations/$f.sql" || exit 1
done
```

Verify, then record. Only after both counts match:

```sql
select count(*) from information_schema.columns
 where table_schema='public' and table_name='video_assets'
   and column_name in ('provider','livepeer_asset_id','livepeer_playback_id','frameworks_asset_id','frameworks_playback_id');  -- 5
select count(*) from information_schema.tables
 where table_schema='public' and table_name in
   ('frameworks_asset_imports','frameworks_vod_access','frameworks_webhook_receipts',
    'frameworks_stream_event_cursors','frameworks_ready_artifacts','frameworks_stream_replacements');                        -- 6
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='process_frameworks_webhook';                                                        -- 1
```

```bash
for v in 20261123051536 20261123053537 20261123054045 20261123143443 20261123144030 20261124051337 20261124170039 20261124182327 20261124182629 20261124183930 20261125143000; do
  supabase migration repair --status applied --db-url "$PROD_DB_CONN" "$v" || exit 1
done
```

## §3 Copy the verified mappings from QA

Dry-run first; the tool writes nothing without `--apply`:

```bash
export FRAMEWORKS_PROD_IMPORT_SUPABASE_URL='https://zdeiezfoemibjgrkyzvs.supabase.co'
COPY_DRY="$(mktemp -d)"
export FRAMEWORKS_PROD_IMPORT_SUPABASE_URL='https://zdeiezfoemibjgrkyzvs.supabase.co'
npx tsx scripts/frameworks-import-mapping-copy.ts --output "$COPY_DRY"
cat "$COPY_DRY/report.json"
```

Review that report. **These two numbers are not the same thing and must not be conflated:**

- `sourceReadyCount` — ready rows in the *QA ledger* (includes assets with no production catalog row).
- `identityUpdates` in the remap dry run below — rows the production catalog will actually change (**25**).

Then apply. `--apply` additionally requires `FRAMEWORKS_PROD_IMPORT_DATABASE_URL` (the write connection,
which the tool checks for the production ref) and a **fresh** output directory — the tool creates it with
`mkdir`, so reusing the dry-run directory fails:

```bash
COPY_APPLY="$(mktemp -d)"
npx tsx scripts/frameworks-import-mapping-copy.ts --apply --output "$COPY_APPLY"
psql "$PROD_DB_CONN" -Atc "select state, count(*) from public.frameworks_asset_imports group by 1 order by 1"
```

`$COPY_APPLY/ready-mappings.json` is the input §4 consumes.

### Credentials the copy tool reads

Exactly these five, and the tool pins which endpoints are acceptable rather than trusting the values:

| variable | role |
| --- | --- |
| `FRAMEWORKS_MIGRATION_SUPABASE_URL` | QA source — must equal `https://zxpobpucayevlrzdxhmr.supabase.co` |
| `FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY` | QA read |
| `FRAMEWORKS_PROD_IMPORT_SUPABASE_URL` | production target — must equal `https://zdeiezfoemibjgrkyzvs.supabase.co` |
| `FRAMEWORKS_PROD_IMPORT_SUPABASE_SERVICE_ROLE_KEY` | production write |
| `FRAMEWORKS_PROD_IMPORT_DATABASE_URL` | production write connection, checked for the production ref |

Supply them from the operator's secret store, not from a shell history or this document.

## §3.5 Pre-window manifest check — run this while #494 builds

The remap re-checks every mapping against the archive manifest, so a manifest mismatch discovered inside
the window costs the window. This check needs **no database access** and uses the same parser the remap
uses:

The check has two steps, both committed, so it can be re-run against a **fresh** snapshot without
recomputing anything by hand:

```bash
# 1. derive the expected set from the snapshot, the archive inventory and the reviewed exceptions
npx tsx scripts/frameworks-remap-expected.ts \
  --snapshot prod-snapshot.json \
  --sources import-queue.json \
  --exceptions lib/video-provider/migration/published-exceptions.json \
  --output expected-set.json

# 2. verify the manifest covers exactly that set
npx tsx scripts/frameworks-remap-manifest-check.ts \
  --manifest manifest.json [--manifest manifest-delta-2026-11-22.json] \
  --expect expected-set.json
```

Step 1 is deliberately **not** derived from the manifest: it builds the expectation from what the import
recorded it uploaded, so step 2 compares two independent records. Building it from the manifest would
make the comparison vacuous.

`--sources` accepts either record the operator actually holds:

| shape | fields |
| --- | --- |
| archive inventory | `assetId`, `playbackId`, `sha256`, `sizeBytes` |
| QA ledger export | `livepeer_asset_id`, `livepeer_playback_id`, `source_sha256`, `source_bytes`, `state` |

Both were run against the same snapshot and produced **the same 25 rows and the same fingerprint**. A
ledger row whose `state` is not `ready` is not a source — marking one `failed` drops it and step 1 exits
1 with that asset in `missingSources` rather than silently building a set of 24.

Expected on success — exit 0 and:

```json
{"mode":"manifest-check","expected":25,"matched":25,"mismatched":0,"missing":[],"executable":true,
 "fingerprint":"660f3e478543df9b0024ec85ae3ccd513acb645a40e7bba5fdc85c9e37888b61"}
```

Both steps print the same `fingerprint`, computed over sorted rows, and it is the canonical identity of the set: if the operator's manifest yields a different fingerprint, the sets differ
and the reason must be understood before the window.

**Retrieved and verified.** The manifest lives in the MEGA folder `crtv3-vod-archive` (public folder link,
key in the URL fragment; readable without an account via `megajs`, which decrypts the fragment key):

| file | bytes | sha256 |
| --- | --- | --- |
| `manifest.json` | 25 395 | `d1aa5c232bb5a3246ca641a24fc2868b8c83273f4d40663e777e8bf712137362` |
| `manifest-delta-2026-11-22.json` | 616 | `7e2d003c006f5f0f4389cf832c71355d570bf4e20d685da22162825e9bd9ab51` |

Both independent checks agree with what was recorded before retrieval: the base file's hash equals the
delta's `baseManifestSha256`, and the archived entries total **45 videos / 5 723 426 515 bytes**, exactly
the figure in `docs/migration/frameworks-release-checkpoint.md`. The manifest holds 51 entries: 45
`archived` and 6 `skipped`.

Rehearsed end to end on the 2026-11-25 snapshot — step 1 reports `published 28, excepted 3, expected 25`,
step 2 reports `matched 25, missing 0, mismatched 0`, and both print
`660f3e478543df9b0024ec85ae3ccd513acb645a40e7bba5fdc85c9e37888b61`. Refusal paths exercised too: a
tampered exception playback id stops step 1 with `Exception playback id for video 145 does not match the
snapshot`, and dropping one inventory row stops it with `missingSources` naming that asset.

Checker result with the real files:

```json
{"manifestAssets":45,"expected":25,"matched":25,"mismatched":0,"missing":[],"executable":true,
 "fingerprint":"660f3e478543df9b0024ec85ae3ccd513acb645a40e7bba5fdc85c9e37888b61"}
```

`manifest.json` is **not committed** — it is an external artifact. Verify the sha256 above after any
re-retrieval; a manifest that hashes differently is a different archive.

The three exceptions, from the same snapshot (28 published − 3 failed = 25), and confirmed against the
production catalog:

| video id | label | asset id | playback id | provider failure |
| --- | --- | --- | --- | --- |
| 145 | Monster | `51e1d8ff-…` | `51e1yompddbkraan` | rendition `track_4` ends 192 710 ms before the source |
| 165 | Tulleti - Brutality | `fac7fe31-…` | `fac7e3gmusdlyvpr` | could not determine source span |
| 180 | "Friends" the Second Single off my debut album "Keys To Success" drops November 24th | `084004dd-…` | `08408ksnl8yeygl5` | could not determine source span |

They live in `lib/video-provider/migration/published-exceptions.json`. Verified against the snapshot: 28
published rows produce 28 blockers with no mappings, the three resolve, and **25 blockers remain** — the
set the remap will convert into updates. The validator re-checks every identity against the run's
snapshot, so a stale entry is refused rather than silently applied.

```sql
select id, title, asset_id, playback_id, status from public.video_assets where id in (145,165,180) order by id;
```

## §4 Remap dry run — the gate

### Inputs, and where each one comes from

The dry run takes four inputs. Three are produced by the steps above; the fourth is an external artifact
and is the easiest to get wrong:

| input | producer | if it is wrong or missing |
| --- | --- | --- |
| `prod-snapshot.json` | the §1 SQL, run against production | blockers appear for videos that are fine, or the counts shift |
| `ready-mappings.json` | **written by §3's `--apply` run** into its own new `--output` directory | `verifiedReadyMappings` is short |
| archive manifest(s) | **the MEGA/archive CLI output already used for the imports** — not produced by this repo | every mapping fails with `Mapping is not ready or does not match its archived source` |
| `published-exceptions.json` | filled from the snapshot for the three named rows | `blockers` will not reach 0, or the validator refuses a placeholder |

The archive manifest is not optional: `buildAssetRemapPlan` re-checks each mapping's `source_sha256`,
`source_bytes` and legacy playback id against the archived source, so a manifest that does not match the
bytes that were imported fails every row rather than a few.



```bash
npx tsx scripts/frameworks-vod-remap.ts \
  --snapshot prod-snapshot.json --mappings "$COPY_APPLY/ready-mappings.json" \
  --manifest <archive manifests…> \
  --published-exceptions published-exceptions.json \
  --output "$(mktemp -d)"
```

Expected, exactly:

```json
{"mode":"dry-run","videoRows":28,"verifiedReadyMappings":25,"identityUpdates":25,
 "publishedExceptions":3,"blockers":0,"unresolvedReferences":0,"executable":true,"databaseWrites":0}
```

Any deviation means stop: 24 updates is a mapping that did not copy, 4 exceptions is an exception the
validator should have refused, and any blocker is an unexpected gap. `executable: true` licenses
generating SQL — it is not evidence that anything was applied.

## §5 Apply the reviewed remap SQL — the step that moves the 25

The dry run in §4 reported `databaseWrites: 0`, which is the point of it: **nothing has moved yet.** This
is the step that changes the catalog, and it belongs inside the #410 window.

```bash
psql "$PROD_DB_CONN" --single-transaction -v ON_ERROR_STOP=1 -f cutover-*/apply.sql
```

Then confirm the 25 rows actually point at FrameWorks, rather than trusting the command's exit code:

```sql
select count(*) from public.video_assets
 where status in ('published','minted') and provider='frameworks'
   and frameworks_asset_id is not null and frameworks_playback_id is not null;   -- expected: 25
```

```sql
-- exactly the three named rows may remain on the retired provider
select id, asset_id, playback_id, provider, frameworks_asset_id from public.video_assets
 where status in ('published','minted')
   and (provider is distinct from 'frameworks' or frameworks_asset_id is null) order by id;
select count(*) from public.frameworks_vod_access;
```

Then the checks that actually decide whether this worked:

| check | decisive signal |
| --- | --- |
| migrated playback | signed-in playhead **advancing against wall-clock** on one migrated video — not a poster, not a `200` from metadata |
| ingest | a real upload completes and appears in the catalog with a FrameWorks identity |
| webhook | a provider event is delivered and **processed** — a 200 from a signature-only route proves nothing |

None of these three has been run. They need production/staging credentials and a live provider.

## §6 Rollback

| lever | target | effect |
| --- | --- | --- |
| identity | `rollback.sql` from the same output dir | reverses remapped identities in one transaction; **retains** `frameworks_vod_access` and import reservations |
| database | the §1 backup | full restore; the last resort |
| deployment | `dpl_F9yyW6RZfqNffoCgto35EGHE5AyM` (`d3a791d52`, `tv.creativeplatform.xyz`) | re-serves the pre-cutover build; re-verify with `vercel inspect` immediately before use |

## Status of this document

| item | status |
| --- | --- |
| production ref pinned from code | **verified** (`zdeiezfoemibjgrkyzvs`, `import-mapping-copy.ts`) |
| migration order + hashes | **computed from committed files, 11 entries**; composition confirmed against production for the ledger, webhook receipts and stream replacements only |
| connection guard | **executed** with dummy credentials — accept and reject cases below |
| backup, DDL, mapping copy, remap, playback, ingest, webhook | **not run** — no production or staging credentials here |
