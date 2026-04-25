# XMTP Moderation Worker

Long-lived process that does two things across all live streams:

1. **History persistence** — appends every chat message to
   `public.stream_chat_messages` (idempotent on `(stream_id, message_id)`).
2. **Ban enforcement** — kicks any sender whose address appears in
   `public.stream_moderation_bans` from the XMTP group.

## Why a separate process?

XMTP's `streamAllMessages` is a long-lived async iterator. Vercel functions
(Edge or Node) can't host that — they time out. The worker therefore needs
a dedicated host: Railway, Render, Fly.io, a small VM, or any environment
that supports a `node` process running indefinitely.

The browser-side fallback in `lib/hooks/xmtp/useLiveChatModerated.ts`
performs the same persist + kick **while the host's tab is open**. The
worker is the always-on guarantor.

## Required env vars

```
XMTP_MODERATION_BOT_PRIVATE_KEY=0x…   # EOA used as the bot identity
XMTP_ENV=production                   # or "dev"
NEXT_PUBLIC_SUPABASE_URL=…
SUPABASE_SERVICE_ROLE_KEY=…
```

## Install + run

The worker lives outside the Next.js build path (the `scripts/` directory
is excluded from `tsconfig.json`). Deploy it as its own package:

```bash
mkdir xmtp-worker && cd xmtp-worker
cp ../crtv3/scripts/xmtp-moderation-worker.ts .
npm init -y
npm i @xmtp/node-sdk @supabase/supabase-js viem dotenv tsx
npx tsx xmtp-moderation-worker.ts
```

For production, run under a process supervisor (PM2, systemd, the platform's
built-in restart policy).

## Inviting the bot to chat groups

The bot can only enforce bans on groups it's a member of with admin rights.
The host's browser is responsible for the invitation. The flow is:

1. Worker boots, prints `inboxId: …`. Set this as `NEXT_PUBLIC_MODERATION_BOT_INBOX_ID`
   in the app's env.
2. On group creation in `useLiveChat`, the host calls
   `group.addMembers([NEXT_PUBLIC_MODERATION_BOT_INBOX_ID])` and (for kick
   rights) `group.addAdmin(NEXT_PUBLIC_MODERATION_BOT_INBOX_ID)`.
3. The host POSTs `{ groupId, streamId }` to a `/api/streams/chat-group`
   endpoint that upserts into `public.stream_chat_groups`. The worker uses
   that table to resolve `conversationId → streamId`.

Both wiring steps are TODOs — the worker scaffold is ready for them but the
client hooks haven't been changed yet. See `useLiveChat.ts:initializeGroup`
for the right insertion point.

## Operational notes

- The bot caches the bans table in memory and refreshes every 15s. Newly-
  added bans take effect on the next message from the offender, not
  retroactively against past messages — those still need `unbanUser` +
  `hideMessage` for older offending messages.
- The ban cache is per-stream; cross-stream isolation is guaranteed by the
  `stream_id` key.
- If the bot is removed from a group (e.g. accidentally by the host), it
  silently drops out of moderation for that stream. The browser fallback
  continues to work.
- The worker is **idempotent and safe to run alongside the browser fallback**
  — both write the same rows with `onConflict: do nothing`.
