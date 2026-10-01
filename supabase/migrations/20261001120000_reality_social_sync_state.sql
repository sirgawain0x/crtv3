-- Tracks Reality.eth social bot cursor per chain (mirrors upstream bot state/*.json).
-- IF NOT EXISTS: if the table already exists without these CHECK constraints, use a follow-up ALTER migration
-- (this file will not retro-fit CHECK constraints). Grants, function, and trigger still apply on re-run.
create table if not exists public.reality_social_sync_state (
  chain_id integer primary key,
  last_timestamp bigint not null default 0,
  last_index integer not null default 0,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint reality_social_sync_state_chain_id_positive check (chain_id > 0),
  constraint reality_social_sync_state_last_timestamp_non_negative
    check (last_timestamp >= 0),
  constraint reality_social_sync_state_last_index_non_negative check (last_index >= 0)
);

alter table public.reality_social_sync_state enable row level security;

-- Service-role-only: no RLS policies for anon/authenticated; explicit grants below.
revoke all on table public.reality_social_sync_state from public, anon, authenticated;
grant all on table public.reality_social_sync_state to service_role;

create or replace function public.set_reality_social_sync_state_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_reality_social_sync_state_updated_at()
  from public, anon, authenticated;
grant execute on function public.set_reality_social_sync_state_updated_at()
  to service_role;

drop trigger if exists reality_social_sync_state_updated_at on public.reality_social_sync_state;
create trigger reality_social_sync_state_updated_at
  before update on public.reality_social_sync_state
  for each row execute function public.set_reality_social_sync_state_updated_at();

comment on table public.reality_social_sync_state is
  'Cursor for /api/predictions/social-sync/cron (Twitter + Mastodon dual-post). Service role only.';
