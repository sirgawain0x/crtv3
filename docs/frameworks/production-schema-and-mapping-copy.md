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

### 1.0 Backup gate — runs before any DDL

`scripts/cutover-backup-gate.sh` performs the dump, proves the archive parses, rehearses a restore into a scratch
database, and records the evidence. It refuses to proceed when any of the following is true:

| guard | why |
| --- | --- |
| `PROD_DB_CONN` has no `sslmode`, a weak one, or a duplicate | a later `sslmode` could otherwise weaken the first |
| `SCRATCH_DB_CONN` resolves to the production host **and** database | a "successful" restore into production is worse than a failed one |
| `$CUTOVER_DIR/backup.dump` already exists | an earlier window's evidence must not be overwritten |
| `pg_dump`, `pg_restore` or `psql` is missing | fail before writing anything |

It records, in `$CUTOVER_DIR/backup-result.json` and `steps.log`: dump byte size, archive entry count from
`pg_restore --list`, restore outcome, and `video_assets` counts in production versus the restored copy — the last of
which is what makes the rehearsal a proof rather than an exercise.

```bash
export CUTOVER_DIR="$(pwd)/cutover-$(date +%Y%m%dT%H%M%S)-$$"   # exported: the script reads it from the environment
export CATALOG_REFERENCE="$CUTOVER_DIR/catalog-before-migration.json"   # captured from production BEFORE the dump
export WRITES_PAUSED=1                                                  # the gate refuses without this
bash scripts/cutover-backup-gate.sh
```

#### The reference and the dump must describe one instant

`pg_dump` is consistent with itself; the catalog reference is a separate read. If a row changes between the two, a
**sound** restore compares unequal and the gate stops on phantom drift — punishing a good backup.

**Default: one exported PostgreSQL snapshot for both** (`CATALOG_SNAPSHOT_MODE=shared`). The gate opens a
`REPEATABLE READ` transaction on production, exports its snapshot, reads the catalog reference inside that
transaction, and runs `pg_dump --snapshot=<id>` before committing:

```
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT pg_export_snapshot();      -- session stays open while pg_dump runs
```

No write pause is involved, so production keeps serving normally. The restored copy is therefore **one coherent
instant**, not a torn read.

**Alternative: a verified write pause** (`CATALOG_SNAPSHOT_MODE=paused`, `WRITES_PAUSED=1`, plus
`CATALOG_REFERENCE`). The gate then samples `pg_stat_activity` for writes during the dump and re-reads the catalog
afterwards, stopping if identities moved. Both checks are detectors, not guarantees — a sub-second write can fall
between samples and a reverting write leaves no net trace.

#### Rehearsed against PostgreSQL 17, not only stubbed

Both modes were exercised end to end on local PostgreSQL 17 with `sslmode=verify-full` and a self-signed CA
(connections without the CA are refused, so the TLS guard is genuinely enforced):

| scenario | result |
| --- | --- |
| shared mode, no concurrent writes | passed — snapshot exported, reference read in-transaction, restore matched, 4/4 identities |
| **shared mode while a writer updated a row continuously** | **passed** — production ended at `concurrent-39`, the restored copy held `concurrent-34`: one instant, no false drift |
| paused mode under the same writer | **stopped**, naming the row: `paused-31` vs `paused-36` — the pause was not real |

That contrast is the point of the mode: the snapshot survives concurrent writes, the pause assertion does not.

One implementation note worth keeping: `psql -A` separates fields with `|`, not a tab. Every multi-column read now
pins `-F $'\t'`, because a pipe-delimited restore silently compares unequal to a tab-delimited reference — which
looks exactly like drift.

#### Inputs

`CATALOG_REFERENCE` is the pre-migration catalog snapshot — `{videos:[{id, asset_id, playback_id, …}], references:[]}`,
the same shape the remap dry run later consumes. It must be captured while production is still pre-migration, because
that is the state the backup is supposed to preserve.

Beyond the row counts, the gate compares **identities row by row**: `id`, legacy `asset_id`, and `playback_id` for every
row in the reference. Counts can match while a row's playback id moved, and a rollback restores the wrong url. Any
missing row or changed value stops the run and names the row; the full diff is written to `catalog-diff.txt`.

It also checks the restored copy is the phase it should be:

| restored copy | expected | meaning |
| --- | --- | --- |
| framework tables (`frameworks_asset_imports`, `frameworks_vod_access`, …) | **0** | the dump predates the migrations |
| identity columns on `video_assets` (`provider`, `livepeer_*`, `frameworks_*`) | **0** here, **5** after the migrations | set `EXPECTED_IDENTITY_COLUMNS` to match the phase |

A dump that already contains the migrations is not a pre-migration baseline, and the gate refuses it rather than
recording it as one. The schema columns this release *adds* are verified after the migrations are applied, not here.

`plan.json` is deliberately **not** an input: it is generated by the dry run, which happens after the backup. The
catalog reference is what ties the backup to reality; `plan.json` is compared against the captured identities at the
dry-run gate.

The script creates `CUTOVER_DIR` itself — with `umask 077`, so owner-only — and refuses an existing non-empty
directory rather than absorbing it into the new run.

Six guard cases are exercised without a database (missing env, absent/weak/duplicate `sslmode`, scratch equal to
production, missing client binaries). The dump-and-restore path itself needs a live connection.

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
COPY_DRY="$CUTOVER_DIR/copy-dry"        # must not exist; the tool creates it with mkdir
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
COPY_APPLY="$CUTOVER_DIR/mappings"      # must not exist; fresh for --apply
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

## §3.6 Staging proof — before the window, and it is not the production check

Two different claims get confused here, so keep them apart:

| claim | where it can be proven | what it does **not** prove |
| --- | --- | --- |
| the media plays and the webhook plumbing works | staging | anything about the production catalog |
| the 25 production rows now point at FrameWorks and play | **production only** | nothing else can substitute |

Staging is the cheap place to find out that signing, manifests, segments and webhook processing work, so
a failure there never enters the window. It cannot stand in for the production check: preview playback of
an archived or preview asset exercises a different catalog row.

Before the window, against a **pinned staging deployment** (`npx vercel inspect <url> --json` → `id`,
`meta.githubCommitSha`):

| check | decisive signal |
| --- | --- |
| playback | signed-in playhead **advancing against wall-clock** on a FrameWorks-backed video — a poster or a `200` from metadata proves neither resolve, signing, manifest fetch nor segment delivery |
| ingest | a real upload completes and appears with a FrameWorks identity |
| webhook | an event is **delivered and processed** — a `200` from a signature-only route proves the gate answered, not that anything ran |

Record the deployment id with each row. A staging pass is evidence about that deployment and that
session; it retires the media/plumbing risk and nothing more.

### Status of the staging smoke test: PASSED (2026-11-27)

Run from a signed-in Chrome against the pinned deployment. Two builds are involved because the first was
superseded mid-test; the evidence is attached to the build that produced it.

| check | deployment | evidence |
| --- | --- | --- |
| playback | `dpl_HPVfJCsRXoS5vdMZGhpnuVkj3wgW` | 17:04:19 EST, playhead 4.89 → 8.20 s on a 20 s clip, five `200`s from `/api/internal/playback-info` just before Play |
| ingest | `dpl_F5esZBmozb4jk8Y7Y568e2sBDWXF` | asset `202611280133060c818dff6b2c412c`, playback `jZaV9t7k0yxBZVhm`, created through the normal creator upload; transfer completed |
| ready webhook | `dpl_F5esZBmozb4jk8Y7Y568e2sBDWXF` | `upload.ready` 19:34:06 EST; log line and receipt share event id `01a21f92-c656-7891-8abf-23e5fb63c404`; `frameworks_ready_artifacts` row for the same `asset_id` |

The pre-cutover relay is proven end to end by these runs: provider → production receiver → relay → staging,
`200` from both. It exists because the provider cannot send `x-vercel-protection-bypass` itself.

Two things this pass does **not** establish, and both should survive into the production run:

1. **The first attempt failed provider-side and its root cause is unknown.** Asset
   `202611280024258b5153ecb4e01efa` stalled at 0% and ended in `upload.failed`; the retry with a normalised
   20-second clip reached ready 62 s after upload start. The two clips differed in duration and encode history,
   so the retry is one success, not a diagnosis. `FAILED` is terminal at the provider — remediating a stall
   always means a new upload.
2. **A `302` to `sso-api` is still the gate answering, not an app failure.** Every unauthenticated probe of these
   hostnames returns it. Never read it as a failed check, and never disable deployment protection or mint a
   bypass to get past it. Note that `/api/livepeer/webhook` is different: unsigned it returns `401` **from the
   application**, which is why a provider delivery can reach it while ordinary pages cannot.

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
# Everything this window produces stays in one directory: COPY_APPLY is this window's mapping-copy output.
COPY_APPLY="$CUTOVER_DIR/mappings"          # set when §3's --apply run is invoked
GENERATED="$CUTOVER_DIR/generated"          # must not exist: the script refuses to reuse a directory

npx tsx scripts/frameworks-vod-remap.ts \
  --snapshot "$CUTOVER_DIR/prod-snapshot.json" --mappings "$COPY_APPLY/ready-mappings.json" \
  --manifest "$MANIFEST_1" "$MANIFEST_2" \
  --published-exceptions "$CUTOVER_DIR/published-exceptions.json" \
  --output "$GENERATED"

step_done dry-run "$(jq -c '.summary' "$GENERATED/plan.json")"
```

`--output` writes `plan.json`, and — only when `executable` is true — `apply.sql` and `rollback.sql` into the same
directory, each mode `0600` with exclusive create (`wx`). That is why the dry run, the apply and the rollback all
come from one path: `$GENERATED`, inside this window's `CUTOVER_DIR`.

Expected, exactly:

```json
{"mode":"dry-run","videoRows":28,"verifiedReadyMappings":25,"identityUpdates":25,
 "publishedExceptions":3,"blockers":0,"unresolvedReferences":0,"executable":true,"databaseWrites":0}
```

Any deviation means stop: 24 updates is a mapping that did not copy, 4 exceptions is an exception the
validator should have refused, and any blocker is an unexpected gap. `executable: true` licenses
generating SQL — it is not evidence that anything was applied.

## §5 Inside the #410 window — apply, then prove production

Order matters: the dry run's `databaseWrites: 0` means nothing has moved, and the apply is the step that
changes the catalog. The gate before it is **25 updates, 3 exceptions, zero blockers** — any other number
is a stop, not a judgement call.

```bash
psql "$PROD_DB_CONN" --single-transaction -v ON_ERROR_STOP=1 -f "$GENERATED/apply.sql"
```

### 5.0 The provider switch is a separate step, and merging does not perform it

**Deploying `main` does not activate FrameWorks.** `resolveVideoProviderId()` (`lib/video-provider/config.ts`)
returns `livepeer` unless `VIDEO_PROVIDER` is literally `frameworks`; the default is stated in the source. The
switch is therefore an environment change plus a redeploy, not a merge:

```bash
vercel env add VIDEO_PROVIDER production      # value: frameworks
# then redeploy production so the new value is baked in, and confirm the running deployment
```

Current state, verified from the code path rather than the dashboard: the staging relay only executes when
`VERCEL_ENV=production` **and** `VIDEO_PROVIDER !== 'frameworks'`, and it did execute during the 2026-11-27 test
(all three lifecycle events returned `204` from the relay). So production is on **livepeer** today.

#### Before anything: capture state and freeze other deploys

Two things recorded before the window opens, because neither can be reconstructed afterwards:

```bash
set -euo pipefail          # a failed vercel call or a broken pipe must not be recorded as a result
umask 077                  # every file created below is owner-only from the moment it exists
VERCEL_PROJECT="${VERCEL_PROJECT:?set VERCEL_PROJECT to the project name or id}"

# A fresh directory per window, created without -p so an existing one aborts the run.
# Never reuse a previous window's directory: a stale capture reads exactly like a current one.
CUTOVER_DIR="$(pwd)/cutover-$(date +%Y%m%dT%H%M%S)-$$"
mkdir "$CUTOVER_DIR" || { echo "STOP: $CUTOVER_DIR already exists" >&2; exit 1; }
[ -z "$(ls -A "$CUTOVER_DIR")" ] || { echo "STOP: $CUTOVER_DIR is not empty" >&2; exit 1; }
echo "window record: $CUTOVER_DIR"

# Append-only progress record. Written only after a step's evidence has been confirmed, never before.
step_done() { printf '%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$1" "$2" >> "$CUTOVER_DIR/steps.log"; }
```

Record that path in #410 when the window opens. Every artifact below — the provider capture, the alias
snapshot, the dry-run JSON, the remap output, the rollback SQL — belongs in this one directory, so a capture can
never be confused with one from an earlier attempt.

Capture, validating the response before any conclusion is drawn from it:

```bash
capture_provider_setting() {
  local out="$CUTOVER_DIR/env-video-provider-before.json"
  local tmp="$CUTOVER_DIR/.env-video-provider-before.json.tmp"
  local raw count
  rm -f "$tmp"

  if ! raw="$(vercel env ls --json --environment production --project "$VERCEL_PROJECT")"; then
    echo "STOP: vercel env ls failed; nothing captured" >&2; return 1
  fi
  # A malformed payload is not evidence of absence.
  if ! printf '%s' "$raw" | jq -e 'type=="object" and has("envs") and (.envs|type=="array")' >/dev/null 2>&1; then
    echo "STOP: unexpected response shape; nothing captured" >&2; return 1
  fi
  # Store only the provider setting; the raw response carries every production value and stays in memory.
  if ! printf '%s' "$raw" | jq '[.envs[] | select(.key=="VIDEO_PROVIDER")]' > "$tmp"; then
    rm -f "$tmp"; echo "STOP: could not write the capture" >&2; return 1
  fi
  if ! count="$(jq 'length' "$tmp")"; then
    rm -f "$tmp"; echo "STOP: capture unreadable" >&2; return 1
  fi
  case "$count" in
    0) echo "VIDEO_PROVIDER: ABSENT — envs parsed, no match" ;;
    1) if ! jq -e '.[0] | has("value") and (.value|type=="string") and ((.value|length)>0)' "$tmp" >/dev/null; then
         rm -f "$tmp"; echo "STOP: VIDEO_PROVIDER exists but its value is unreadable" >&2; return 1
       fi
       echo "VIDEO_PROVIDER: present, value captured" ;;
    *) rm -f "$tmp"; echo "STOP: $count VIDEO_PROVIDER entries; unusable" >&2; return 1 ;;
  esac
  mv "$tmp" "$out"          # committed only after every check passed
}
capture_provider_setting

vercel inspect tv.creativeplatform.xyz > "$CUTOVER_DIR/alias-before-window.txt"
```

The capture is written to a temporary file and moved into place only after validation, so **a failed capture leaves
no record that could later be read as a result.** Exercised against eight stubbed responses before being written
here:

| stub response | exit | record left |
| --- | --- | --- |
| envs array, no `VIDEO_PROVIDER` | 0 | `[]` — a validated absence |
| envs array with a value | 0 | entry with the value |
| `VIDEO_PROVIDER` present, no value | 1 | **none** |
| `VIDEO_PROVIDER` present, empty value | 1 | **none** |
| object without `envs` | 1 | **none** |
| non-JSON / timeout text | 1 | **none** |
| CLI exits non-zero | 1 | **none** |
| duplicate `VIDEO_PROVIDER` entries | 1 | **none** |

Only an empty array from a parsed `envs` payload records absence. If the value is hidden, resolve it before
anything changes: dashboard reveal, or `vercel env pull` into a temporary file deleted once recorded. Keep
`$CUTOVER_DIR` in the authorized store, never in the repository.

Read the result as three states, not two:

| captured | meaning | rollback |
| --- | --- | --- |
| `[]` | the variable was absent | remove what the window adds |
| entry with a `value` | present, value known | set that exact value back |
| entry with no readable `value` | present, value hidden | **resolve it before changing anything**, then treat as the row above |

The third row is the one that causes damage: an unreadable value does not mean the variable was absent, so treating
it as absent would delete a setting the environment relied on. Resolve it first — dashboard reveal, or
`vercel env pull` into a temporary file that is deleted after the value is recorded.

**If the window is parked and the deploy freeze lifted**, the recorded baseline stops being "immediate pre-switch":
any later production deploy supersedes it. On resume, re-read `vercel inspect tv.creativeplatform.xyz`, record the
new baseline, and update §6's rollback target before capturing anything else. A stale baseline is re-verifiable; a
window that assumes it is still current is not.

Then **pause other production deployments from the prebuild through the smoke tests and the provider-setting
persistence**. A hotfix or a merge landing mid-window would build against a half-switched provider setting, and
the smoke tests would then be measuring a deployment nobody chose. Note who owns that freeze and when it lifts.

#### Prebuild the FrameWorks deployment so the switch is an alias move, not a build

A redeploy takes minutes; the remap-to-switch gap should not. Build the deployment **without moving the alias**,
using settings scoped to that one deployment so nothing project-wide changes:

```bash
# from a clean checkout of the approved commit, not the working tree
APPROVED_SHA="${APPROVED_SHA:?set APPROVED_SHA to the release-branch commit}"
git worktree add "$CUTOVER_DIR/build" "$APPROVED_SHA"
cd "$CUTOVER_DIR/build"
yarn install --frozen-lockfile --production=false --network-timeout 600000   # yarn.lock is the only lockfile
yarn build           # optional pre-flight; the Vercel build repeats it

NEW_DEPLOYMENT_URL="${NEW_DEPLOYMENT_URL:?set after the prebuild reports its URL}"
vercel deploy --prod --skip-domain \
  --build-env VIDEO_PROVIDER=frameworks \
  --env VIDEO_PROVIDER=frameworks
```

There is **no `package-lock.json`** in this repository — `npm ci` fails. `yarn.lock` is the only lockfile and the
CI workflow installs with `yarn install --production=false --network-timeout 600000`, so `--frozen-lockfile` here
is what keeps the build honest about the committed dependencies.

`--skip-domain` applies to this deployment only: it disables automatic promotion, so `tv.creativeplatform.xyz`
keeps serving the current deployment while the new one builds. `--build-env` and `--env` are per-deployment as
well, which is why this path is preferred over writing the project setting before the window.

Before deploying, and again before promoting, confirm the alias still points at the rollback target from §6:

```bash
vercel inspect tv.creativeplatform.xyz     # expect dpl_F9yyW6RZfqNffoCgto35EGHE5AyM
```

Promote only after the remap has been applied:

```bash
vercel promote "$NEW_DEPLOYMENT_URL"       # alias move: seconds, no rebuild
```

#### When to persist the project-wide setting

The per-deployment flags make the switch reversible in one step, but they also mean the **next** production build
would compile as Livepeer again — silently reverting the cutover on the first hotfix. So persist the setting, but
only after §5.2 and §5.3 pass:

```bash
vercel env add VIDEO_PROVIDER production   # value: frameworks — applies to the next build, not the running one
```

Do this once the cutover is proven, so subsequent deploys stay on FrameWorks without per-deployment flags.

#### If the cutover rolls back

Promoting the old deployment is **not** sufficient on its own — it would leave the project setting in place, and
the next build would compile as FrameWorks again:

```bash
vercel promote "$ROLLBACK_DEPLOYMENT_URL"         # 1. move the alias back
# 2. restore VIDEO_PROVIDER to the state captured before the window:
#    - if it had a value, set that exact value again
#    - if it was absent, remove what this window added
# 3. optionally redeploy so the running build matches the project setting exactly
# 4. run the identity rollback from the SAME remap output directory used to apply it
```

Step 2 is a restore, not a deletion — if `VIDEO_PROVIDER` existed before the cutover, removing it changes state the
window never owned. Step 4 matters because rollback SQL generated from a different output directory can target a
plan that was never applied.

Do step 2 whenever the persist step ran, and record which state the project is left in.

**The remap and the switch must be adjacent.** Applying the remap first leaves 25 catalog rows pointing at
FrameWorks asset ids while the provider still resolves to Livepeer, and those videos fail playback until the
switch lands. Switching first, then remapping, instead leaves rows carrying Livepeer ids under a FrameWorks
provider. Neither gap is avoidable, so keep it to seconds: apply → promote → §5.1 → §5.2 → §5.3, and roll back
if §5.2 cannot open one of the 25.

### 5.1 Confirm the row count

```sql
select count(*) from public.video_assets
 where status in ('published','minted') and provider='frameworks'
   and frameworks_asset_id is not null and frameworks_playback_id is not null;   -- 25
```

```sql
-- exactly the three named rows may remain on the retired provider
select id, asset_id, playback_id, provider, frameworks_asset_id from public.video_assets
 where status in ('published','minted')
   and (provider is distinct from 'frameworks' or frameworks_asset_id is null) order by id;
select count(*) from public.frameworks_vod_access;   -- >= 25
```

### 5.2 Migrated playback — proves the catalog migration

Prerequisite: the dry run in §4 reported **25 updates, 3 exceptions, 0 blockers**, and the remap has been applied
inside the approved window. Any other count is a stop.

Then open **one of the 25** through the production catalog with `tv.creativeplatform.xyz` serving FrameWorks, and
record:

| field | value |
| --- | --- |
| video | `id` and title from the 25 |
| deployment | `vercel inspect tv.creativeplatform.xyz` at the time of the test |
| start time | wall clock when Play was pressed |
| playhead | start and end position, against elapsed wall clock |
| response | `/api/internal/playback-info` statuses observed |

Not evidence for this row: archive or preview playback, a metadata or poster `200`, or any pass recorded on a
staging deployment. Only the production catalog row demonstrates that the migration moved *that* video.

### 5.3 New upload and webhook — proves production ingest and webhook processing

A different proof from §5.2, and not interchangeable with it: a remapped video shows the catalog moved, a fresh
upload shows that production **accepts and processes** new ingest. Both are required; neither substitutes for the
other.

Upload one disposable clip in production and record the upload time, the asset id and the playback id. The
acceptance triple — the shape verified on staging in #409 — is all three of:

| # | evidence | requirement |
| --- | --- | --- |
| 1 | post-commit log | `[frameworks webhook] event processed { eventId, assetId, playbackId }` on the production deployment |
| 2 | receipt | a `public.frameworks_webhook_receipts` row whose `event_id` equals that `eventId` |
| 3 | asset state | a `public.frameworks_ready_artifacts` row for the same `asset_id`, `event_type = 'upload.ready'` |

Rules that decide whether the evidence counts:

- **A `200` alone is not evidence.** An event type outside the business set returns `200 {"ok":true}` and
  processes nothing; the receipt and the asset row are what distinguish processing from acknowledgement.
- **A replay counts only if its `event_id` has never been recorded.** A replay carrying a fresh `webhook-id` is
  processed normally and satisfies all three rows above; an id already in `frameworks_webhook_receipts` is a
  duplicate — it returns `204`, writes nothing and emits no log line, indistinguishable in a request log from an
  ignored lifecycle event. So check the id, not the fact that the delivery was a repeat.
- **`FAILED` is terminal, and needs a new upload.** The provider exposes no reprocess operation, so a failed asset
  can never satisfy this check; a stall is remediated by a new upload with new event ids.
- **Readiness cannot be polled.** `/api/internal/playback-info` answers with an x402 payment challenge
  (0.05 USDC per call) and the provider's HLS path needs a signed `fwjwt`; wait for the ready webhook instead.
- **An empty `vercel logs <deployment>` from a shell is a tooling gap, not a finding.** Read delivery from the
  Vercel dashboard or the provider's delivery history.
- **Timing is a triage aid, not a timeout.** On staging the ready event arrived 62 s after upload start; the
  failed attempt took 6 m 37 s to fail. Neither bound is a threshold to fail against.

If either §5.2 or §5.3 fails after the switch, roll back first (§6) and report afterwards.

### 5.4 Resuming an interrupted window

**A missing `steps.log` entry is not evidence that the step did not run.** A database write commits and then the
shell dies; the log line never appears. So for any interrupted write, the state comes from the system of record —
the database or the alias — never from the log.

#### What the generated SQL actually guarantees

`renderAssetRemapSql` emits every patch as one transaction (`BEGIN … COMMIT`) guarded by a division that fails the
transaction when a row is in an unexpected state:

```sql
WITH changed AS (UPDATE public.video_assets SET … WHERE id=… AND <before-state> … RETURNING id)
SELECT 1 / CASE WHEN (SELECT count(*) FROM changed)=1
                OR EXISTS (SELECT 1 FROM public.video_assets WHERE id=… AND <after-state> …)
           THEN 1 ELSE 0 END AS identity_guard;
```

Three consequences, all relevant to a resume:

| consequence | why |
| --- | --- |
| **the remap is all-or-nothing** | the file is one transaction under `--single-transaction`; a shell that dies mid-file commits nothing |
| **re-running `apply.sql` is safe** | already-applied rows satisfy the `EXISTS(<after-state>)` branch, so the guard passes them |
| **a drifted row aborts the run** | a row in neither before nor after state makes the guard `1/0`, which fails the transaction instead of skipping it |

#### `rollback.sql` requires confirmed application first

Rollback runs the same guard with the states reversed. On a plan that was **never applied**, its `UPDATE` matches
nothing, the `EXISTS(<before-state>)` branch is true, and the statement **succeeds while changing nothing**. A
no-op that reports success is the worst possible outcome after an incident, so:

> Run `rollback.sql` only after confirming the remap was applied — 25 rows carrying `frameworks_asset_id`, and
> exactly the three named exceptions still on the retired provider. If those counts are not present, the rollback is
> not the lever you want; reconcile first.

#### Schema: applied but unrecorded is a real state

The apply order is DDL **then** record the version. If the shell stops between them, `schema_migrations` shows a
version as absent while the schema has already changed — so the ledger alone cannot decide whether to re-run.

On resume, for each pending version:

1. **inspect the actual schema** that version is responsible for — tables, columns, constraints, indexes, functions —
   and compare it to what the migration file creates
2. if it matches **exactly**, verify it against the migration's own checks and then record the version
   (`supabase migration repair --status applied <version> --db-url …`), rather than re-running the DDL
3. if the schema is partially present, differs in any detail, or you cannot tell — **stop.** Re-running DDL over a
   partially applied migration is how a schema ends up in a state neither the migration nor the backup describes

#### Remap: compare identities, not counts

The 25-row count and the three exception IDs are a summary, and a summary cannot identify which plan was applied —
two different plans can produce the same counts. The resume check compares the **exact rows and values** in
`plan.json`:

```bash
GENERATED="$CUTOVER_DIR/generated"
npx tsx scripts/frameworks-remap-verify.ts "$GENERATED/plan.json" > "$CUTOVER_DIR/patches.tsv"
```

The predicates come from `identityStatePredicates`, which shares `condition`/`literal` with the apply SQL — the same
function that decides whether a row may be updated decides whether it has already been updated. That matters for
`NULL`: a legacy row carries `null` in `frameworks_asset_id`, and any hand-rolled comparison renders it as
`= 'null'`, which matches nothing. Every untouched row would then read as ambiguous. The generator emits
`IS NOT DISTINCT FROM NULL`, which matches.

Each predicate is **scoped to its planned row id** with the same literal handling `apply.sql` uses, so a count over
the table cannot be satisfied by a different row. Verified against PGlite (real Postgres semantics) with a legacy row
containing nulls and an apostrophe, plus a second row carrying the planned values:

| row state | before predicate | after predicate | reading |
| --- | --- | --- | --- |
| untouched legacy row | 1 | 0 | unmapped |
| `frameworks_asset_id = NULL` (hand-rolled) | 0 | — | matches nothing, three-valued logic |
| `frameworks_asset_id = 'null'` (hand-rolled) | 0 | 0 | **misreads as ambiguous** |
| after apply | 0 | 1 | applied |
| drifted value | 0 | 0 | genuinely ambiguous — stop |
| target drifted while another row holds the planned values | 0 | 0 | **still ambiguous** — the impostor cannot stand in for the planned row |
| the same predicate with `id=` removed | — | 1 | what an unscoped count would have matched |

For each line, count the rows matching the `before` predicate and the `after` predicate — no `where id=…` is needed
at the call site, because the predicate carries it:

| before | after | reading |
| --- | --- | --- |
| 1 | 0 | this row is unmapped — the plan has not been applied to it |
| 0 | 1 | this row already carries the planned identity — applied |
| 0 | 0 | **ambiguous** — the row matches neither state; stop and reconcile |
| 1 | 1 | **ambiguous** — the conditions overlap; the plan cannot distinguish them |

Every patch must read the same way. Mixed readings mean the applied state does not correspond to a single plan, and
the response is reconciliation against `plan.json`, not a retry.

#### Determine state, then act

| step | state to read | before | after | neither |
| --- | --- | --- | --- | --- |
| schema | actual schema objects vs the migration file, then the ledger | record-and-verify, or re-run if nothing applied | record the version | stop (§ schema) |
| mappings | row counts in production | re-run the copy | log it done | stop — reconcile |
| remap | per-patch `before`/`after` comparison from `plan.json` | re-run `apply.sql` (safe) | log it done | stop — never hand-patch rows |
| switch | `vercel inspect tv.creativeplatform.xyz` | promote | log it done | stop — someone else promoted |

Rules for an interrupted run:

- **resume from `$CUTOVER_DIR` only.** A second directory means a second plan.
- **check the live state before retrying anything that writes.** Never retry on the assumption that a missing log
  means nothing happened.
- **ambiguous state means stop and reconcile against `plan.json`** — it holds the exact before/after identity for
  every row, so it is the only basis for deciding whether to complete, roll back, or open a fresh window.
- **append to `steps.log` only after confirming evidence**, and append for work discovered to have completed while
  the shell was down — otherwise the next operator re-derives the same ambiguity.
- **do not hand-patch rows to make a guard pass.** A row in neither state is a signal that the catalog does not
  match the reviewed plan.

## §6 Rollback

| lever | target | effect |
| --- | --- | --- |
| identity | `"$GENERATED/rollback.sql"` — same directory that produced the applied plan | reverses remapped identities in one transaction; **retains** `frameworks_vod_access` and import reservations |
| database | the §1 backup | full restore; the last resort |
| deployment | `dpl_F9yyW6RZfqNffoCgto35EGHE5AyM` (`d3a791d52`, `tv.creativeplatform.xyz`) | re-serves the pre-cutover build; re-verify with `vercel inspect` immediately before use |
| provider setting | restore the state captured before the window — the exact prior value, or removal **only** if it was absent | **restore, not delete**; promoting the old deployment alone leaves whatever the project now holds, and the next build would compile against it |

## Status of this document

| item | status |
| --- | --- |
| production ref pinned from code | **verified** (`zdeiezfoemibjgrkyzvs`, `import-mapping-copy.ts`) |
| migration order + hashes | **computed from committed files, 11 entries**; composition confirmed against production for the ledger, webhook receipts and stream replacements only |
| connection guard | **executed** with dummy credentials — accept and reject cases below |
| staging playback, ingest, ready webhook | **verified** 2026-11-27 on `dpl_HPVfJCsRXoS5vdMZGhpnuVkj3wgW` and `dpl_F5esZBmozb4jk8Y7Y568e2sBDWXF` (§3.6) |
| backup, DDL, mapping copy, remap, production playback, production ingest | **not run** — no production credentials here; awaits the approved #410 window |
