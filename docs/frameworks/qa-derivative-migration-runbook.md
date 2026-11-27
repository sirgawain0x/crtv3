# QA runbook — FrameWorks derivative recovery migration

Applying this migration **authorizes nothing**. It adds schema only. Upload approval is a
separate, later decision recorded in `lib/video-provider/migration/reviewed-derivative-plans.json`
and must not be bundled with this step.

| item | value |
|---|---|
| Environment | QA only — project **`creative-tv-frameworks-qa`** |
| Project ref | read from `FRAMEWORKS_MIGRATION_SUPABASE_URL` (host is `<ref>.supabase.co`); never paste the key |
| Migration | `20261126093000_frameworks_derivative_recovery` |
| File | `supabase/migrations/20261126093000_frameworks_derivative_recovery.sql` |
| SHA-256 | `16996e88324d82855136ca07471039337c57b0e5e7d4dd6ced6815e6b250b1b6` |
| Size | 181 lines |
| Prerequisite | `20261124183930_frameworks_import_reconciliation` — creates the table, the trigger and `preserve_frameworks_recovery_evidence()` |

Re-check the hash before applying. If it differs, the file changed and the review no longer
covers it:

```bash
shasum -a 256 supabase/migrations/20261126093000_frameworks_derivative_recovery.sql
```

## 0. Preconditions

```bash
export QA_DATABASE_URL='postgresql://…'    # direct/pooler connection string for the QA project
export FRAMEWORKS_MIGRATION_SUPABASE_URL='https://<qa-ref>.supabase.co'
export FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY='…'
```

`QA_DATABASE_URL` is a Postgres connection string — the service-role key is a REST credential and
cannot apply DDL.

```sql
-- The prerequisite must already be present. If either row returns 0, STOP.
select count(*) from information_schema.columns
 where table_schema='public' and table_name='frameworks_import_recoveries'
   and column_name in ('livepeer_asset_id','state','reviewed_by');

select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='preserve_frameworks_recovery_evidence';
```

```sql
-- The published Tulleti source must still be failed, with its original provider ids retained,
-- and must have no recovery row. Expected: 1 | failed | (not null) | (not null) | 0 | 0
select count(*),
       min(a.state),
       min(a.frameworks_asset_id) is not null as asset_retained,
       min(a.frameworks_playback_id) is not null as playback_retained,
       (select count(*) from public.frameworks_import_recoveries r
         where r.livepeer_asset_id='fac7fe31-599d-405e-90d1-b406b08d728a') as recovery_rows
  from public.frameworks_asset_imports a
 where a.livepeer_asset_id='fac7fe31-599d-405e-90d1-b406b08d728a';
```

## 1. Backup (do not skip)

The migration is additive, but it adds CHECK constraints that validate **existing** rows, and the
columns it adds are evidence that must survive a rollback.

```bash
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump "$QA_DATABASE_URL" \
  --table='public.frameworks_import_recoveries' \
  --table='public.frameworks_asset_imports' \
  --schema-only --no-owner > "qa-recovery-schema-$STAMP.sql"
pg_dump "$QA_DATABASE_URL" \
  --table='public.frameworks_import_recoveries' \
  --table='public.frameworks_asset_imports' \
  --data-only --column-inserts --no-owner > "qa-recovery-data-$STAMP.sql"
pg_dump "$QA_DATABASE_URL" \
  --table='public.frameworks_import_recoveries' \
  --data-only --column-inserts --no-owner | shasum -a 256 > "qa-recovery-data-$STAMP.sha256"
```

Also take a dashboard/PITR checkpoint if available. Keep the timestamped files; they are the only
rollback that preserves derivative evidence.

## 2. Apply

Preferred (records the migration ledger itself):

```bash
supabase link --project-ref <qa-ref>
supabase db push
```

Direct alternative:

```bash
psql "$QA_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261126093000_frameworks_derivative_recovery.sql

# Record it in the ledger using the CLI, not a hand-written insert.
supabase migration repair --status applied 20261126093000 --project-ref <qa-ref>
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

-- d) the trigger still exists and the function body now handles derivative evidence.
--    Expected: 1 | true
select (select count(*) from pg_trigger where tgname='preserve_frameworks_recovery_evidence'
         and not tgisinternal) as trigger_present,
       (select p.prosrc ilike '%derivative_sha256%' from pg_proc p
          join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname='preserve_frameworks_recovery_evidence') as body_updated;

-- e) ledger. Expected: 1
select count(*) from supabase_migrations.schema_migrations
 where version='20261126093000';
```

Then the application-side probe (read-only, zero writes):

```bash
npx tsx scripts/frameworks-derivative-recover.ts --verify-schema
# expected: {"stage":"verify-schema","derivativeColumnsPresent":true,"providerRequests":0,"databaseWrites":0}
```

`--verify-schema` covers columns only. (b)–(d) are the checks it cannot make.

## 4. Rollback

Only before any recovery row exists. Once a transfer has happened, the columns hold the evidence
that justifies the substitution — restore from the step-1 dump instead of dropping them.

```sql
begin;
drop function if exists public.adopt_reviewed_derivative_recovery(uuid);
drop function if exists public.prepare_reviewed_derivative_recovery(text,text,text,bigint,text,bigint,text,text);
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

The trigger function must be restored to its pre-migration body from
`20261124183930_frameworks_import_reconciliation.sql`; do not drop the trigger, or the original
identity columns lose their immutability protection.

```bash
supabase migration repair --status reverted 20261126093000 --project-ref <qa-ref>
```

## 5. Stop conditions — halt and report if any is true

1. The file hash differs from `16996e88…50b1b6`.
2. Steps 0 checks fail: the prerequisite migration, table, function or trigger is missing.
3. `fac7fe31…` is not `failed`, has lost its original provider ids, or already has a recovery row.
4. Step 1 backup is not written and hash-verified.
5. Any step-3 count is below its expected value.
6. `recovery_kind_domain` / `recovery_derivative_evidence` fails because existing rows violate it —
   report the offending rows; do not delete or coerce them.
7. `--verify-schema` reports `derivativeColumnsPresent:false` after a claimed success.
8. Anyone proposes approving a plan in the same change as this migration.

## 6. Explicitly not part of this step

No plan status change, no `--prepare`, no `--upload`, no provider request. The migration makes the
ledger usable; the first byte leaves only after a separate `upload-approved` decision naming this
QA origin and the exact credential.
