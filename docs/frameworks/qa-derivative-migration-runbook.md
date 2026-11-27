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

Run §0–§4 in **one shell session**: `QA_DB_CONN` and `PGSSLMODE` are exported there and every later
`psql`/`pg_dump` depends on them.

```bash
export QA_DATABASE_URL='postgresql://…?sslmode=verify-full'              # input, DDL + dumps
export FRAMEWORKS_MIGRATION_SUPABASE_URL='https://zxpobpucayevlrzdxhmr.supabase.co'
export FRAMEWORKS_MIGRATION_SUPABASE_SERVICE_ROLE_KEY='…'
```

```bash
set -euo pipefail

# Emits a sanitised connection string on stdout (all diagnostics go to stderr) and
# exits non-zero unless the target is provably the pinned QA project.
QA_DB_CONN=$(python3 - "$QA_DATABASE_URL" "$FRAMEWORKS_MIGRATION_SUPABASE_URL" <<'PY'
import re, sys, urllib.parse

QA_REF = "zxpobpucayevlrzdxhmr"
db_url, rest_url = sys.argv[1], sys.argv[2]

def stop(msg):
    print(f"STOP: {msg}", file=sys.stderr)
    sys.exit(1)

rest = urllib.parse.urlsplit(rest_url)
if rest.scheme != "https" or rest.hostname != f"{QA_REF}.supabase.co" \
        or rest.port not in (None, 443) or rest.path not in ("", "/") \
        or rest.query or rest.fragment or rest.username or rest.password:
    stop(f"REST URL is not exactly https://{QA_REF}.supabase.co")

u = urllib.parse.urlsplit(db_url)
if u.scheme not in ("postgres", "postgresql"):
    stop(f"database URL scheme is {u.scheme!r}")

q = urllib.parse.parse_qs(u.query, keep_blank_values=True)

# libpq honours these after any check of the authority, so they are refused outright.
overrides = {"host", "hostaddr", "port", "user", "password", "dbname", "service",
             "servicefile", "passfile", "options", "target_session_attrs"}
hit = sorted(overrides & set(q))
if hit:
    stop(f"connection URI overrides the checked target via {hit}")
unexpected = sorted(set(q) - {"sslmode"})
if unexpected:
    stop(f"unexpected connection parameters {unexpected}")

# Exactly one sslmode, and it must verify the hostname. A duplicate would let the
# forwarded URI disagree with the value checked here.
modes = q.get("sslmode", [])
if len(modes) != 1:
    stop("sslmode must appear exactly once")
if modes[0] != "verify-full":
    stop(f"sslmode must be verify-full (got {modes[0]!r}); hostname verification is required")

host = (u.hostname or "").lower()
user = u.username or ""
user_ref = user.split(".", 1)[1] if user.startswith("postgres.") else None

if host == f"db.{QA_REF}.supabase.co":
    if user not in ("postgres", f"postgres.{QA_REF}"):
        stop(f"direct host with unexpected user {user!r}")
elif re.fullmatch(r"aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com", host) and user_ref == QA_REF:
    pass
else:
    stop(f"database URL does not target {QA_REF} (host={host!r} user={user!r})")

# Everything that was validated is kept; the query string is dropped so nothing
# unchecked can reach libpq, and TLS policy comes from the environment instead.
print(urllib.parse.urlunsplit((u.scheme, u.netloc, u.path or "/postgres", "", "")))
PY
) || exit 1

export PGSSLMODE=verify-full
if [ -z "${PGSSLROOTCERT:-}" ]; then
  echo "NOTE: PGSSLROOTCERT unset - verify-full will use system roots; set it to the QA CA bundle if the system store cannot validate the host"
fi
echo "connection target validated for $PGSSLMODE (URI query removed)"
```

`QA_DB_CONN` is the sanitised string — validated parts only, no query — and `PGSSLMODE=verify-full`
applies to **every** later `psql` and `pg_dump`, so the connection that sends the password is the one
that verifies the certificate. The separate probe below is additional evidence, not a substitute for
that:

```bash
DB_HOST=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.urlsplit(sys.argv[1]).hostname)' "$QA_DB_CONN")
DB_PORT=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.urlsplit(sys.argv[1]).port or 5432)' "$QA_DB_CONN")
openssl s_client -connect "$DB_HOST:$DB_PORT" -servername "$DB_HOST" </dev/null 2>/dev/null \
  | openssl x509 -noout -checkhost "$DB_HOST"

# Proves the session psql actually got is TLS, rather than trusting the flag.
psql "$QA_DB_CONN" -Atc "select current_user, current_database(), ssl, version
  from pg_stat_ssl where pid = pg_backend_pid()"
```

A password-authenticated connection presents the credential while connecting, so the URI parse plus
`verify-full` are the gate; the `pg_stat_ssl` row confirms what was reached.

Executed branches (dummy credentials, asserting the reason and not only the exit code): direct ✓ ·
direct as `postgres.<ref>` ✓ · pooler ✓ · `?sslmode=require` ✓ · `?host=` ✗ · `?hostaddr=` ✗ ·
`?port=` ✗ · `?service=` ✗ · `?sslmode=disable` ✗ · production REST ✗ · production DB ✗ ·
lookalike pooler host with a correct `postgres.<ref>` username ✗ · pooler host with another ref ✗ ·
direct host with another ref's user ✗.

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

pg_dump "$QA_DB_CONN" \
  --table='public.frameworks_import_recoveries' \
  --table='public.frameworks_asset_imports' \
  --schema-only --no-owner > "$SCHEMA_FILE"

pg_dump "$QA_DB_CONN" \
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
psql "$QA_DB_CONN" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261126093000_frameworks_derivative_recovery.sql

supabase migration repair --status applied --db-url "$QA_DB_CONN" 20261126093000
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
# or: --db-url "$QA_DB_CONN" 20261126093000
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
| Connection guard (§0) | **executed** in 12 dummy-credential scenarios asserting the reason and that the emitted string carries no query: direct and pooler with `verify-full` accepted; missing, empty, `require`, `verify-ca` and duplicated `sslmode`, `?host=` override, production REST/DB, lookalike pooler and a foreign user all refused |
| Prerequisite function hashes (§0.1 c) | **matched QA** (reviewer-confirmed) |
| Prerequisite structural assertions (§0.1 a/b/d/e) | reviewer confirmed 14 columns, 2 uniques and 1 foreign key; the constraint-definition, grant and trigger rows are **not yet reported** |
| Verification queries (§3) | apply-side counts exercised on the same PGlite run (4 / 4 / 2 / trigger 1 / body updated) |
| Backup commands (§1) | `pg_dump` **not executed** (needs QA credentials); the fail-closed guard was **executed** against four synthetic files — empty, missing-table and truncated all stopped, a complete dump passed |
| `db push` / `migration repair` (§2, §4) | syntax checked against Supabase CLI 2.110.0, **not run** |
| Anything against the live QA project | **not run** |

## 6. Stop conditions — halt and report if any is true

1. The migration file hash differs from `16996e88…50b1b6`.
2. §0 cannot prove both credentials target `zxpobpucayevlrzdxhmr`, the URI carries target-overriding
   parameters (`host`, `hostaddr`, `port`, `service`, …), or `sslmode` is not exactly one
   `verify-full`.
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
