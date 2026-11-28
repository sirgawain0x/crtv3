# Limited cutover — release the 25 verified mappings with three named exceptions

**TL;DR** Three published videos have no verified FrameWorks mapping: **Monster**, **Friends** and
**Tulleti – Brutality**. Because the remap refuses to run while any published row lacks a mapping, those
three block all 25 verified rows. This change adds a reviewed, snapshot-bound exception list so the tool
skips *only* the named rows and still halts on any other gap. Nothing here has been run against
production: the identities must come from a fresh production snapshot, which requires credentials this
environment does not hold.

## Why a new exception path instead of relaxing the guard

The guard — *a published video without a verified ready mapping is a blocker* — is what makes the remap
safe. Deleting or weakening it would let one unmapped record become a silently skipped publication.
`lib/video-provider/migration/published-exceptions.ts` instead removes a blocker only when a reviewed
entry matches the snapshot **exactly**, and every unmatched blocker stays.

| condition | result |
| --- | --- |
| named row is published, unmapped, identities match the snapshot | skipped, recorded in `publishedExceptions` |
| named row has a verified mapping | **refused** — it must be remapped, not excepted |
| named row already carries a FrameWorks identity | **refused** |
| asset/playback id differs from the snapshot | **refused** — the row changed |
| row is a draft, or not published/minted | **refused** |
| duplicate video id or duplicate identity pair | **refused** |
| label or reason empty, or placeholder (`PENDING…`, `TBD`, …) | **refused** |
| a published row is unmapped and *not* named | **still a blocker** |
| `exceptions` contains an entry matching no blocker | **refused** — stale list |

Placeholder rejection is deliberate: an unfilled template must fail loudly rather than authorize a skip
after someone flips a field.

## The exception file

Reviewed, checked in beside the derivative plans. Three entries, ids taken from a fresh production
snapshot — `PENDING-…` values appear here only to show shape, and are rejected by the validator:

```json
[
  {
    "videoId": 0,
    "legacyAssetId": "PENDING-PRODUCTION-SNAPSHOT",
    "legacyPlaybackId": "PENDING-PRODUCTION-SNAPSHOT",
    "label": "Monster",
    "reason": "Provider import failed; recovery tracked separately. Playback remains impaired until recovered."
  },
  { "videoId": 0, "legacyAssetId": "…", "legacyPlaybackId": "…", "label": "Friends", "reason": "…" },
  { "videoId": 0, "legacyAssetId": "…", "legacyPlaybackId": "…", "label": "Tulleti - Brutality", "reason": "…" }
]
```

Do not commit the file until every field is filled from the snapshot and the dry run below is clean.

## Preconditions — all three, in order

### 1. Fresh production snapshot

The inventory count must be re-derived, not remembered. Same SQL the tool consumes
(`--snapshot`), run read-only against production:

```sql
select json_build_object(
  'videos', (select json_agg(json_build_object(
      'id',v.id,'asset_id',v.asset_id,'playback_id',v.playback_id,'status',v.status,
      'updated_at',to_char(v.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'provider',v.provider,'livepeer_asset_id',v.livepeer_asset_id,'livepeer_playback_id',v.livepeer_playback_id,
      'frameworks_asset_id',v.frameworks_asset_id,'frameworks_playback_id',v.frameworks_playback_id,
      'parent_playback_id',v.parent_playback_id,'creator_id',v.creator_id,
      'requires_metoken',v.requires_metoken,'metoken_price',v.metoken_price) order by v.id) from public.video_assets v),
  'references', json_build_array(
    (select json_agg(json_build_object('table','hack_beta_submissions','id',h.id::text,
        'values',json_build_object('video_asset_id',h.video_asset_id,'playback_id',h.playback_id),
        'updated_at',to_char(h.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) order by h.id)
       from public.hack_beta_submissions h where coalesce(h.video_asset_id,h.playback_id) is not null),
    (select json_agg(json_build_object('table','shoppable_videos','id',s.id::text,
        'values',json_build_object('livepeer_asset_id',s.livepeer_asset_id,'livepeer_playback_id',s.livepeer_playback_id),
        'updated_at',to_char(s.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) order by s.id)
       from public.shoppable_videos s where coalesce(s.livepeer_asset_id,s.livepeer_playback_id) is not null),
    (select json_agg(json_build_object('table','metoken_transactions','id',m.id::text,
        'values',json_build_object('playback_id',m.playback_id),
        'updated_at',to_char(m.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) order by m.id)
       from public.metoken_transactions m where m.playback_id is not null)
  )
) as snapshot;
```

Ready mappings come from the ledger via `scripts/frameworks-import-mapping-copy.ts` / the copy step
already reviewed in #491 — the count is expected to be **25**, and that expectation is a hypothesis until
this run prints it.

### 2. Production backup before any DDL/DML

```bash
umask 077; set -euo pipefail
pg_dump "$PROD_DB_CONN" --schema-only  -f "prod-schema-$(date +%Y%m%dT%H%M%SZ).sql"
pg_dump "$PROD_DB_CONN" --data-only \
  -t public.video_assets -t public.frameworks_asset_imports -t public.frameworks_vod_access \
  -t public.metoken_transactions -t public.hack_beta_submissions -t public.shoppable_videos \
  -f "prod-data-$(date +%Y%m%dT%H%M%SZ).sql"
shasum -a 256 prod-*.sql | tee prod-backup.sha256
shasum -c prod-backup.sha256     # fail loudly on any mismatch
```

`pg_dump` for a **17 MB-class** schema plus six tables is cheap; the restore rehearsal is not optional —
a backup nobody has restored is a file, not a recovery path.

### 3. Production schema comparison

The remap's guards reference specific columns (`frameworks_asset_id`, `frameworks_playback_id`,
`provider`, `parent_playback_id`) and the ledger table used by the ready-mapping `EXISTS` check. Compare
the live catalog against the migration set before generating SQL — a guard on a column that does not exist
fails at apply time, inside the transaction, which is safe but wastes the maintenance window:

```bash
python3 scripts/generate-migration-drift-sql.py --ref origin/staging > prod-drift.sql
psql "$PROD_DB_CONN" -f prod-drift.sql
```

## Dry run, then apply

```bash
npx tsx scripts/frameworks-vod-remap.ts \
  --snapshot prod-snapshot.json --mappings ready-mappings.json \
  --manifest <archive manifests…> \
  --published-exceptions published-exceptions.json \
  --output ./cutover-$(date +%Y%m%dT%H%M%SZ)

# expected: verifiedReadyMappings 25, publishedExceptions 3, blockers 0,
#           unresolvedReferences 0, executable true, databaseWrites 0
```

`executable: true` with `blockers: 0` is the licence to generate SQL — it is not evidence that anything
was applied. The output directory also holds `apply.sql` and `rollback.sql`; both are reviewed before use.

Apply inside one transaction, with the catalog guard and the per-exception guards active:

```bash
psql "$PROD_DB_CONN" --single-transaction -v ON_ERROR_STOP=1 -f cutover-*/apply.sql
```

The SQL aborts if any published row is neither remapped nor named, or if a named row is no longer in the
unmapped shape that was reviewed. Both conditions are checked *inside* the transaction, so an abort
leaves production untouched.

## Verification after apply

```sql
-- 1. no published row is left on the retired provider except the three reviewed exceptions
select id, asset_id, playback_id, provider, frameworks_asset_id
  from public.video_assets
 where status in ('published','minted')
   and (provider is distinct from 'frameworks' or frameworks_asset_id is null)
 order by id;   -- expected: exactly the three named rows

-- 2. access records exist for every remapped published video
select count(*) from public.frameworks_vod_access;   -- expected: >= 25

-- 3. nothing was deleted
select count(*) from public.video_assets;            -- expected: unchanged from the snapshot
```

## Rollback

Two independent levers, and they are not interchangeable:

1. **Identity rollback** — `rollback.sql` from the same output directory, one transaction. It reverses the
   remapped identities and deliberately **retains** the `frameworks_vod_access` records and import
   reservations, so a rollback does not re-open the provider gap.
2. **Deployment rollback** — pinned by id, not by description: production currently serves
   `dpl_F9yyW6RZfqNffoCgto35EGHE5AyM` (commit `d3a791d52`, aliases `tv.creativeplatform.xyz`,
   `crtv4.vercel.app`). Verify with `vercel inspect` immediately before switching; PR #491's body carries
   conflicting commit text for this target and must not be used as the source of truth.

## Status of this preparation

| item | status |
| --- | --- |
| exception mechanism + validator | **implemented**, 5 unit tests pass locally |
| SQL guards (catalog + per-exception) | **implemented**; runtime behaviour verified by a pglite test that runs in CI only |
| refusal semantics table above | **executed** — each refusal is a passing test |
| fresh production snapshot / 25 count | **BLOCKED** — no production database credential in this environment |
| production backup + restore rehearsal | **BLOCKED** — same |
| production drift comparison | **BLOCKED** — same (`pg_dump` now installed locally) |
| staging ingest / webhook / migrated-playback checks | **BLOCKED** — no staging service credentials |
| rollback deployment target | **verified by id** (`dpl_F9yyW6RZfqNffoCgto35EGHE5AyM`) |
| #409 sign-off, #410 cutover approval | open; production switch needs the explicit OK in #410 |

**The decision this rests on:** three published videos will remain on the retired provider with impaired
playback until their recoveries land. That is a product decision, recorded here rather than inferred.
