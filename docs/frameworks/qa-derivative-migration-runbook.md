# QA runbook — FrameWorks derivative recovery migration

Applying this migration **authorizes nothing**. It adds schema only. Upload approval is a
separate, later decision recorded in `lib/video-provider/migration/reviewed-derivative-plans.json`
and must not be bundled with this step.

| item | value |
|---|---|
| Environment | QA only — project **`creative-tv-frameworks-qa`** |
| Project ref | `<qa-ref>`, from `FRAMEWORKS_MIGRATION_SUPABASE_URL` (host must be `<qa-ref>.supabase.co`) |
| Migration | `20261126093000_frameworks_derivative_recovery` |
| File | `supabase/migrations/20261126093000_frameworks_derivative_recovery.sql` |
| SHA-256 | `16996e88324d82855136ca07471039337c57b0e5e7d4dd6ced6815e6b250b1b6` |
| Size | 181 lines |
| Prerequisite | `20261124183930_frameworks_import_reconciliation` — creates the table, the trigger and `preserve_frameworks_recovery_evidence()` |

```bash
shasum -a 256 supabase/migrations/20261126093000_frameworks_derivative_recovery.sql
# must equal 16996e88…50b1b6; otherwise the file changed and the review no longer covers it
```

## 0. Prove the connection is QA — before a backup or any DDL

Two credentials are in play and nothing yet proves they point at the same database. A misconfigured
`QA_DATABASE_URL` would apply this migration to production.

```bash
export QA_DATABASE_URL='postgresql://…'                                  # DDL + dumps
export FRAMEWORKS_MIGRATION_SUPABASE_URL='https://<qa-ref>.supabase.co'  # REST, used by --verify-schema
export FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY='…'
```

```bash
QA_REF=$(printf '%s' "$FRAMEWORKS_MIGRATION_SUPABASE_URL" \
  | sed -E 's#^https://([a-z0-9-]+)\.supabase\.co/?$#\1#')
case "$QA_REF" in
  http*|"") echo "STOP: FRAMEWORKS_MIGRATION_SUPABASE_URL is not https://<ref>.supabase.co"; exit 1 ;;
esac

DB_HOST=$(printf '%s' "$QA_DATABASE_URL" | sed -E 's#^postgres(ql)?://([^@]*@)?([^/:?]+).*#\3#')
DB_USER=$(printf '%s' "$QA_DATABASE_URL" | sed -E 's#^postgres(ql)?://([^:@/]+).*#\2#')

echo "project ref : $QA_REF"
echo "db host     : $DB_HOST"
echo "db user     : $DB_USER"

# Direct connections use db.<ref>.supabase.co; the shared pooler carries the ref in the
# username as postgres.<ref>. Anything else is a different project.
if [ "$DB_HOST" = "db.$QA_REF.supabase.co" ]; then
  echo "OK: direct connection to $QA_REF"
elif [ "$DB_USER" = "postgres.$QA_REF" ]; then
  echo "OK: pooler connection for $QA_REF"
else
  echo "STOP: QA_DATABASE_URL does not target $QA_REF (host=$DB_HOST user=$DB_USER)"; exit 1
fi

psql "$QA_DATABASE_URL" -Atc "select current_user, current_database()"
```

A host that merely contains the ref as a substring fails the equality test and stops the run.

## 0.1 Prerequisites — the trigger is a precondition, not a result

This migration does **not** create the trigger. It replaces the body of
`preserve_frameworks_recovery_evidence()`, which `20261124183930` created along with the
`preserve_frameworks_recovery_evidence` BEFORE UPDATE trigger. Each query states its expected value.

```sql
-- a) prerequisite columns. Expected: 3
select count(*) from information_schema.columns
 where table_schema='public' and table_name='frameworks_import_recoveries'
   and column_name in ('livepeer_asset_id','state','reviewed_by');

-- b) trigger function and the trigger attached to the table. Expected: 1 | 1
select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname='preserve_frameworks_recovery_evidence') as fn_present,
       (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
         where c.relname='frameworks_import_recoveries'
           and t.tgname='preserve_frameworks_recovery_evidence' and not t.tgisinternal) as trigger_present;
```

```sql
-- c) the published Tulleti source. Expected exactly: 1 | failed | t | t | 0
select count(*)                                        as rows,
       min(a.state)                                    as state,
       bool_and(a.frameworks_asset_id is not null)     as asset_retained,
       bool_and(a.frameworks_playback_id is not null)  as playback_retained,
       (select count(*) from public.frameworks_import_recoveries r
         where r.livepeer_asset_id='fac7fe31-599d-405e-90d1-b406b08d728a') as recovery_rows
  from public.frameworks_asset_imports a
 where a.livepeer_asset_id='fac7fe31-599d-405e-90d1-b406b08d728a';
```

## 1. Backup — hash the files you would actually restore

Both dumps matter: the migration adds CHECK constraints that validate **existing** rows, and the
columns it adds become evidence that must survive a rollback.

```bash
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

# Hash the saved files themselves, then verify those checksums against those files.
shasum -a 256 "$SCHEMA_FILE" "$DATA_FILE" > "qa-recovery-$STAMP.sha256"
shasum -a 256 -c "qa-recovery-$STAMP.sha256"

chmod 600 "$SCHEMA_FILE" "$DATA_FILE" "qa-recovery-$STAMP.sha256"
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

It will not, yet: the prerequisite `20261124183930` exists in QA (objects verified in 0.1) but its
version is **not recorded** in QA's ledger, so `db push` would try to re-run it and fail on existing
objects. Record it before pushing:

```bash
supabase migration repair --status applied --linked 20261124183930
supabase db push --dry-run --linked     # re-check: only 20261126093000 should remain
supabase db push --linked
```

Direct alternative, for when `--linked` is unavailable. Syntax checked against Supabase CLI 2.110.0:

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

Rehearse on a scratch project before relying on this; it has **not** been executed anywhere.

Order matters twice: the trigger function must be restored **before** the columns are dropped,
because until then its body references `derivative_*`; and the RPCs must be dropped with their exact
signatures — `prepare_reviewed_derivative_recovery` takes `uuid` first, so a `text`-first drop leaves
the function in place.

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

Post-rollback checks: expected `0 | 0 | 0` — columns, constraints, RPCs gone; and an UPDATE on any
recovery row must still raise `Recovery evidence is immutable`.

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
| Rollback block (§4) | **executed** against PGlite (Postgres in WASM): apply → rollback → 11/11 assertions, including that an UPDATE still raises `Recovery evidence is immutable` afterwards |
| Connection identity check (§0) | **tested** with dummy URLs across six scenarios: direct ✓, pooler ✓, lookalike host ✗, wrong ref ✗, `http://` REST ✗, ref-hidden-in-path ✗ |
| Verification queries (§3 a–e) | the apply-side counts were exercised on the same PGlite run (4 / 4 / 2 / trigger 1 / body updated) |
| Backup commands (§1) | **not executed** — need QA credentials |
| `db push` / `migration repair` (§2, §4) | syntax checked against Supabase CLI 2.110.0, **not run** |
| Anything against the real QA project | **not run** |

## 6. Stop conditions — halt and report if any is true

1. The migration file hash differs from `16996e88…50b1b6`.
2. Section 0 cannot prove `QA_DATABASE_URL` and the REST URL target the same `<qa-ref>`.
3. Section 0.1 returns anything below its stated expectation — columns 3, function 1, trigger 1.
4. `fac7fe31…` is not `failed`, has lost its original provider ids, or already has a recovery row.
5. The backup files are not written, checksum-verified and stored off-repo.
6. `db push --dry-run` lists any migration other than `20261126093000`.
7. Any step-3 count differs from its expected value, or `--verify-schema` reports `false` after a
   claimed success.
8. `recovery_kind_domain` / `recovery_derivative_evidence` fails because existing rows violate it —
   report the offending rows; do not delete or coerce them.
9. Anyone proposes approving a plan in the same change as this migration.

## 7. Explicitly not part of this step

No plan status change, no `--prepare`, no `--upload`, no provider request. The migration makes the
ledger usable; the first byte leaves only after a separate `upload-approved` decision naming this QA
origin and the exact credential.
