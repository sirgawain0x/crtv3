# QA runbook — FrameWorks derivative recovery migration

Applying this migration **authorizes nothing**. It adds schema only. Upload approval is a
separate, later decision recorded in `lib/video-provider/migration/reviewed-derivative-plans.json`
and must not be bundled with this step.

| item | value |
|---|---|
| Environment | QA only — project **`creative-tv-frameworks-qa`** |
| Project ref | **`zxpobpucayevlrzdxhmr`** — pinned constant, never derived from the URL being checked |
| Migration | `20261126093000_frameworks_derivative_recovery` |
| File | `supabase/migrations/20261126093000_frameworks_derivative_recovery.sql` |
| SHA-256 | `16996e88324d82855136ca07471039337c57b0e5e7d4dd6ced6815e6b250b1b6` |
| Size | 181 lines |
| Prerequisite | `20261124183930_frameworks_import_reconciliation` — table, trigger, three functions |

```bash
shasum -a 256 supabase/migrations/20261126093000_frameworks_derivative_recovery.sql
# must equal 16996e88…50b1b6; otherwise the file changed and the review no longer covers it
```

## 0. Prove both credentials target the pinned QA project

The ref is a constant. Deriving it from the URL under test let two URLs that both pointed at
production agree with each other and pass. Exact host equality is required in every branch, and the
pooler branch also requires a `pooler.supabase.com` host so the database password is never sent to
an unrelated host.

```bash
export QA_DATABASE_URL='postgresql://…'                                  # DDL + dumps
export FRAMEWORKS_MIGRATION_SUPABASE_URL='https://zxpobpucayevlrzdxhmr.supabase.co'
export FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY='…'
```

```bash
set -euo pipefail
QA_REF='zxpobpucayevlrzdxhmr'

REST_HOST=$(printf '%s' "$FRAMEWORKS_MIGRATION_SUPABASE_URL" | sed -E 's#^https://([^/]+)/?$#\1#')
[ "$REST_HOST" = "$QA_REF.supabase.co" ] || {
  echo "STOP: REST URL host '$REST_HOST' is not $QA_REF.supabase.co"; exit 1; }

DB_HOST=$(printf '%s' "$QA_DATABASE_URL" | sed -E 's#^postgres(ql)?://([^@]*@)?([^/:?]+).*#\3#')
DB_USER=$(printf '%s' "$QA_DATABASE_URL" | sed -E 's#^postgres(ql)?://([^:@/]+).*#\2#')

if [ "$DB_HOST" = "db.$QA_REF.supabase.co" ]; then
  echo "OK: direct connection to $QA_REF"
elif printf '%s' "$DB_HOST" | grep -Eq '^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$' \
     && [ "$DB_USER" = "postgres.$QA_REF" ]; then
  echo "OK: pooler connection for $QA_REF ($DB_HOST)"
else
  echo "STOP: QA_DATABASE_URL does not target $QA_REF (host=$DB_HOST user=$DB_USER)"; exit 1
fi
```

Executed branches: direct ✓ · pooler ✓ · production REST ✗ · production DB ✗ · lookalike pooler host
with a correct `postgres.<ref>` username ✗ · pooler host with another ref ✗ ·
`pooler.supabase.com.evil.example` ✗ · `http://` REST ✗.

## 0.1 Verify the whole prerequisite, not three columns

This migration does **not** create the table or the trigger. It replaces the body of
`preserve_frameworks_recovery_evidence()`, which `20261124183930` created. Recording that version as
applied on weak evidence can hide a partial or different schema and let later migrations run on an
invalid base, so the whole shape is checked here. Each query states its expected value.

```sql
-- a) columns. Expected: 14 | 14
select count(*) as total,
       count(*) filter (where column_name in ('livepeer_asset_id','livepeer_playback_id',
         'source_sha256','source_bytes','original_asset_id','original_playback_id',
         'state','reason','reviewed_by','created_at','updated_at','adopted_at',
         'frameworks_asset_id','frameworks_playback_id')) as evidence_columns
  from information_schema.columns
 where table_schema='public' and table_name='frameworks_import_recoveries';

-- b) behavioural constraints. Expected: t | 2 | 1 | 2
select
  (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='frameworks_import_recoveries' and c.contype='c'
      and pg_get_constraintdef(c.oid) ilike '%prepared%'
      and pg_get_constraintdef(c.oid) ilike '%failed%') = 1 as state_check_present,
  (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='frameworks_import_recoveries' and c.contype='c'
      and (pg_get_constraintdef(c.oid) ilike '%original_asset_id%'
        or pg_get_constraintdef(c.oid) ilike '%original_playback_id%')) as reuse_checks,
  (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='frameworks_import_recoveries' and c.contype='f') as fkey,
  (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
    where t.relname='frameworks_import_recoveries' and c.contype='u') as uniques;

-- c) the three prerequisite functions by body hash. Expected: 3 rows, md5s per the table below.
select p.proname, pg_get_function_identity_arguments(p.oid) as args, md5(p.prosrc) as body_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public'
   and p.proname in ('preserve_frameworks_recovery_evidence',
                     'prepare_reviewed_frameworks_recovery','adopt_verified_frameworks_recovery')
 order by p.proname;

-- d) trigger attached. Expected: 1
select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
 where c.relname='frameworks_import_recoveries'
   and t.tgname='preserve_frameworks_recovery_evidence' and not t.tgisinternal;

-- e) service_role grants. Expected: INSERT,SELECT,UPDATE
select string_agg(privilege_type, ',' order by privilege_type)
  from information_schema.role_table_grants
 where table_schema='public' and table_name='frameworks_import_recoveries'
   and grantee='service_role';
```

| function | expected body md5 (from applying the reviewed prerequisite file) |
|---|---|
| `preserve_frameworks_recovery_evidence()` | `69803bf69db4b80ac12088954f3c41db` |
| `prepare_reviewed_frameworks_recovery(text)` | `731e60245b87432db1133436f7b757ae` |
| `adopt_verified_frameworks_recovery(uuid)` | `cf5d24def22bb4345fe0baa4eb18171e` |

A mismatch means QA holds a different body than the reviewed migration. Stop and diff the bodies;
do not assume corruption, and do not repair the ledger (§2.1).

```sql
-- f) the published Tulleti source. Expected exactly: 1 | failed | t | t | 0
select count(*)                                        as rows,
       min(a.state)                                    as state,
       bool_and(a.frameworks_asset_id is not null)     as asset_retained,
       bool_and(a.frameworks_playback_id is not null)  as playback_retained,
       (select count(*) from public.frameworks_import_recoveries r
         where r.livepeer_asset_id='fac7fe31-599d-405e-90d1-b406b08d728a') as recovery_rows
  from public.frameworks_asset_imports a
 where a.livepeer_asset_id='fac7fe31-599d-405e-90d1-b406b08d728a';
```

## 1. Backup — fail fast, private from creation, verified as usable

`set -euo pipefail` so a failed dump stops the run instead of leaving a partial file that gets hashed
and reported as verified. `umask 077` so files are private from creation, not from a later `chmod`.

```bash
set -euo pipefail
umask 077

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
SCHEMA_FILE="qa-recovery-schema-$STAMP.sql"
DATA_FILE="qa-recovery-data-$STAMP.sql"

pg_dump "$QA_DATABASE_URL" \
  --table='public.frameworks_import_recoveries' \
  --table='public.frameworks_asset_imports' \
  --schema-only --no-owner > "$SCHEMA_FILE"

pg_dump "$QA_DATABASE_URL" \
  --table='public.frameworks_import_recoveries' \
  --table='public.frameworks_asset_imports' \
  --data-only --column-inserts --no-owner > "$DATA_FILE"

# Usable, not merely present.
for f in "$SCHEMA_FILE" "$DATA_FILE"; do
  [ -s "$f" ] || { echo "STOP: $f is empty"; exit 1; }
  grep -q 'frameworks_import_recoveries' "$f" || { echo "STOP: $f lacks frameworks_import_recoveries"; exit 1; }
  tail -3 "$f" | grep -q 'PostgreSQL database dump complete' || { echo "STOP: $f looks truncated"; exit 1; }
done

shasum -a 256 "$SCHEMA_FILE" "$DATA_FILE" > "qa-recovery-$STAMP.sha256"
shasum -a 256 -c "qa-recovery-$STAMP.sha256"
```

Store all three off-repo (QA data is customer data — never commit them) and take a dashboard/PITR
checkpoint if available. Keep the stamp: it identifies the restore set.

## 2. Apply — inspect the pending set first

`supabase db push` applies **every** pending migration, not just this one.

```bash
supabase link --project-ref "$QA_REF"
supabase migration list --linked        # what the remote ledger records
supabase db push --dry-run --linked     # what a push would apply
```

**Stop unless the dry run lists exactly `20261126093000`.**

### 2.1 Recording the prerequisite is a separate, reviewed action

QA has the prerequisite's objects (verified in 0.1) but its version is absent from the ledger, so a
push would try to re-run it. Repairing history **hides** a schema mismatch instead of revealing it,
so it is not part of the default path:

1. Attach the complete 0.1 output, every value matched, to the review.
2. A reviewer decides. Only then:

```bash
supabase migration repair --status applied --linked 20261124183930
supabase db push --dry-run --linked     # re-check: only 20261126093000 may remain
```

If any 0.1 check fails — a differing body hash, a missing constraint, a missing grant — **do not
repair**. Reconcile the schema instead of recording it as applied.

### 2.2 Apply

```bash
supabase db push --linked
```

Direct alternative when `--linked` is unavailable. Syntax checked against Supabase CLI 2.110.0:

```bash
psql "$QA_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261126093000_frameworks_derivative_recovery.sql

supabase migration repair --status applied --db-url "$QA_DATABASE_URL" 20261126093000
```

## 3. Verify

```sql
-- a) four columns. Expected: 4
select count(*) from information_schema.columns
 where table_schema='public' and table_name='frameworks_import_recoveries'
   and column_name in ('recovery_kind','derivative_sha256','derivative_bytes','derivative_origin');

-- b) four constraints. Expected: 4
select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
 where t.relname='frameworks_import_recoveries'
   and c.conname in ('recovery_kind_domain','recovery_derivative_evidence',
                     'recovery_ready_needs_derivative','recovery_derivative_differs');

-- c) three functions. Expected: 3
select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public'
   and p.proname in ('prepare_reviewed_derivative_recovery','adopt_reviewed_derivative_recovery',
                     'preserve_frameworks_recovery_evidence');

-- d) trigger intact and function body extended. Expected: 1 | t
select (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
         where c.relname='frameworks_import_recoveries'
           and t.tgname='preserve_frameworks_recovery_evidence' and not t.tgisinternal) as trigger_present,
       (select p.prosrc ilike '%derivative_sha256%' from pg_proc p
          join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname='preserve_frameworks_recovery_evidence') as body_updated;

-- e) ledger. Expected: 1
select count(*) from supabase_migrations.schema_migrations where version='20261126093000';
```

```bash
npx tsx scripts/frameworks-derivative-recover.ts --verify-schema
# expected: {"stage":"verify-schema","derivativeColumnsPresent":true,"providerRequests":0,"databaseWrites":0}
```

`--verify-schema` proves the four columns only; (b)–(e) are checks it cannot make.

## 4. Rollback

Order matters twice: the trigger function is restored **before** the columns are dropped, because
until then its body references `derivative_*`; and the RPCs are dropped with exact signatures —
`prepare_reviewed_derivative_recovery` takes `uuid` first, so a `text`-first drop leaves the function
behind.

```sql
begin;

-- 1) restore the pre-migration trigger function body, verbatim from 20261124183930
CREATE OR REPLACE FUNCTION public.preserve_frameworks_recovery_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (NEW.livepeer_asset_id,NEW.livepeer_playback_id,NEW.source_sha256,NEW.source_bytes,NEW.original_asset_id,NEW.original_playback_id,NEW.reason,NEW.reviewed_by,NEW.created_at)
 IS DISTINCT FROM (OLD.livepeer_asset_id,OLD.livepeer_playback_id,OLD.source_sha256,OLD.source_bytes,OLD.original_asset_id,OLD.original_playback_id,OLD.reason,OLD.reviewed_by,OLD.created_at)
 OR (OLD.frameworks_asset_id IS NOT NULL AND NEW.frameworks_asset_id IS DISTINCT FROM OLD.frameworks_asset_id)
 OR (OLD.frameworks_playback_id IS NOT NULL AND NEW.frameworks_playback_id IS DISTINCT FROM OLD.frameworks_playback_id)
 OR (OLD.adopted_at IS NOT NULL AND NEW.adopted_at IS DISTINCT FROM OLD.adopted_at) THEN
 RAISE EXCEPTION 'Recovery evidence is immutable'; END IF;
 RETURN NEW;
END;
$$;

-- 2) exact signatures; first argument is uuid
drop function if exists public.adopt_reviewed_derivative_recovery(uuid);
drop function if exists public.prepare_reviewed_derivative_recovery(
  uuid,text,text,bigint,text,bigint,text,text);

-- 3) constraints first, then the columns they depend on
alter table public.frameworks_import_recoveries
  drop constraint if exists recovery_derivative_differs,
  drop constraint if exists recovery_ready_needs_derivative,
  drop constraint if exists recovery_derivative_evidence,
  drop constraint if exists recovery_kind_domain,
  drop column if exists recovery_kind,
  drop column if exists derivative_origin,
  drop column if exists derivative_bytes,
  drop column if exists derivative_sha256;

commit;
```

```bash
supabase migration repair --status reverted --linked 20261126093000
# or: --db-url "$QA_DATABASE_URL" 20261126093000
```

Post-rollback checks: expected `0 | 0 | 0` for columns, constraints and RPCs, with the trigger still
present and an UPDATE still raising `Recovery evidence is immutable`.

```sql
select (select count(*) from information_schema.columns where table_schema='public'
         and table_name='frameworks_import_recoveries'
         and column_name in ('recovery_kind','derivative_sha256','derivative_bytes','derivative_origin')) as columns,
       (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
         where t.relname='frameworks_import_recoveries'
           and c.conname in ('recovery_kind_domain','recovery_derivative_evidence',
                             'recovery_ready_needs_derivative','recovery_derivative_differs')) as constraints,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public'
           and p.proname in ('prepare_reviewed_derivative_recovery','adopt_reviewed_derivative_recovery')) as rpcs;
```

Once a recovery row exists, do **not** drop these columns: they are the evidence justifying the
substitution. Restore the step-1 dump instead and escalate.

## 5. Testing status of this document

| part | status |
|---|---|
| Rollback block (§4) | **executed** against PGlite on top of both migrations: 11/11 assertions, including immutability after rollback |
| Connection identity check (§0) | **executed** in 8 dummy-credential scenarios; production REST/DB, lookalike pooler host with a correct username, and `http://` all refused |
| Prerequisite function hashes (§0.1 c) | produced by applying the reviewed prerequisite file to PGlite; `prosrc` is the text the file declares |
| Prerequisite structural assertions (§0.1 a/b/d/e) | authored from that run; **not** run against QA |
| Verification queries (§3) | apply-side counts exercised on the same PGlite run (4 / 4 / 2 / trigger 1 / body updated) |
| Backup commands (§1) | `pg_dump` **not executed** (needs QA credentials); the fail-closed guard was **executed** against four synthetic files — empty, missing-table and truncated all stopped, a complete dump passed |
| `db push` / `migration repair` (§2, §4) | syntax checked against Supabase CLI 2.110.0, **not run** |
| Anything against the live QA project | **not run** |

## 6. Stop conditions — halt and report if any is true

1. The migration file hash differs from `16996e88…50b1b6`.
2. §0 cannot prove both credentials target `zxpobpucayevlrzdxhmr`.
3. Any §0.1 value differs from its expectation — including a function body hash — or fewer than 14
   columns, 1 state check, 2 reuse checks, 1 foreign key, 2 uniques.
4. `fac7fe31…` is not `failed`, has lost its original provider ids, or already has a recovery row.
5. The backup files are not non-empty, not cleanly terminated, not checksum-verified, or not stored
   off-repo.
6. `db push --dry-run` lists any migration other than `20261126093000`.
7. Anyone proposes repairing the ledger (§2.1) without the complete §0.1 output attached.
8. Any §3 count differs from its expected value, or `--verify-schema` reports `false` after a
   claimed success.
9. `recovery_kind_domain` / `recovery_derivative_evidence` fails because existing rows violate it —
   report the offending rows; do not delete or coerce them.
10. Anyone proposes approving a plan in the same change as this migration.

## 7. Explicitly not part of this step

No plan status change, no `--prepare`, no `--upload`, no provider request. The migration makes the
ledger usable; the first byte leaves only after a separate `upload-approved` decision naming this QA
origin and the exact credential.
