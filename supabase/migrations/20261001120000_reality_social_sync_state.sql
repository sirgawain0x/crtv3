-- Tracks Reality.eth social bot cursor per chain (mirrors upstream bot state/*.json).
create table if not exists public.reality_social_sync_state (
  chain_id integer primary key,
  last_timestamp bigint not null default 0,
  last_index integer not null default 0,
  updated_at timestamptz not null default now()
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
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reality_social_sync_state_updated_at on public.reality_social_sync_state;
create trigger reality_social_sync_state_updated_at
  before update on public.reality_social_sync_state
  for each row execute function public.set_reality_social_sync_state_updated_at();

comment on table public.reality_social_sync_state is
  'Cursor for /api/predictions/social-sync/cron (Twitter + Mastodon dual-post). Service role only.';
