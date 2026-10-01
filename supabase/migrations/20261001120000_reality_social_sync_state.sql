-- Tracks Reality.eth social bot cursor per chain (mirrors upstream bot state/*.json).
create table if not exists public.reality_social_sync_state (
  chain_id integer primary key,
  last_timestamp bigint not null default 0,
  last_index integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.reality_social_sync_state enable row level security;

comment on table public.reality_social_sync_state is
  'Cursor for /api/predictions/social-sync/cron (Twitter + Mastodon dual-post). Service role only.';
