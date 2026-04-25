-- Stream chat moderation tables
-- All three tables are keyed by stream_id (which holds the Livepeer playback_id —
-- the same value used as the chat's group key on /watch/[playbackId]).

-- 1. Hidden message IDs. Clients filter these out of the rendered chat.
create table if not exists public.stream_moderation_hidden_messages (
  stream_id text not null,
  message_id text not null,
  hidden_by text not null,
  hidden_at timestamptz default now(),
  primary key (stream_id, message_id)
);

create index if not exists stream_moderation_hidden_messages_stream_id_idx
  on public.stream_moderation_hidden_messages (stream_id);

-- 2. Banned addresses (per stream). Clients drop messages from these senders
-- and refuse to send their own when the sender is banned.
create table if not exists public.stream_moderation_bans (
  stream_id text not null,
  banned_address text not null,
  banned_by text not null,
  banned_at timestamptz default now(),
  primary key (stream_id, banned_address)
);

create index if not exists stream_moderation_bans_stream_id_idx
  on public.stream_moderation_bans (stream_id);

-- 3. Moderators (per stream). The stream's creator is implicitly always a moderator
-- (looked up via the streams table); this table holds *additional* addresses the
-- creator has appointed — humans, or AI agents like the Creative AI Digital Twin.
create table if not exists public.stream_moderation_moderators (
  stream_id text not null,
  moderator_address text not null,
  appointed_by text not null,
  appointed_at timestamptz default now(),
  primary key (stream_id, moderator_address)
);

create index if not exists stream_moderation_moderators_stream_id_idx
  on public.stream_moderation_moderators (stream_id);

-- RLS: anyone can read moderation state (clients need it to filter chat).
-- Writes go through server actions using the service role.
alter table public.stream_moderation_hidden_messages enable row level security;
alter table public.stream_moderation_bans enable row level security;
alter table public.stream_moderation_moderators enable row level security;

drop policy if exists "Public can view hidden messages" on public.stream_moderation_hidden_messages;
create policy "Public can view hidden messages"
  on public.stream_moderation_hidden_messages
  for select
  using (true);

drop policy if exists "Public can view bans" on public.stream_moderation_bans;
create policy "Public can view bans"
  on public.stream_moderation_bans
  for select
  using (true);

drop policy if exists "Public can view moderators" on public.stream_moderation_moderators;
create policy "Public can view moderators"
  on public.stream_moderation_moderators
  for select
  using (true);

-- Mutations: only allow service role (server actions). Wallet-address auth lives
-- in the action layer since this app authenticates via @account-kit (not Supabase auth).
drop policy if exists "Service role can write hidden messages" on public.stream_moderation_hidden_messages;
create policy "Service role can write hidden messages"
  on public.stream_moderation_hidden_messages
  for all
  using ((select auth.uid()) is null)
  with check ((select auth.uid()) is null);

drop policy if exists "Service role can write bans" on public.stream_moderation_bans;
create policy "Service role can write bans"
  on public.stream_moderation_bans
  for all
  using ((select auth.uid()) is null)
  with check ((select auth.uid()) is null);

drop policy if exists "Service role can write moderators" on public.stream_moderation_moderators;
create policy "Service role can write moderators"
  on public.stream_moderation_moderators
  for all
  using ((select auth.uid()) is null)
  with check ((select auth.uid()) is null);
