# Creative TV — X (Twitter) integration spec

**Audience:** Engineers setting up production posting for Reality.eth prediction alerts.  
**Scope:** X/Twitter only (Mastodon is documented separately).  
**Code path:** `lib/reality-social/publish-twitter.ts` → `GET /api/predictions/social-sync/cron`

---

## 1. What we are building

Creative TV runs a **server-side bot** that:

1. Polls the Reality.eth subgraph (Base, chain `8453`) for new questions and newly finalized answers.
2. Formats a short status with title, bounty/bond hints, and a link to **`https://<your-domain>/predict/{questionId}`**.
3. Posts to X using **OAuth 1.0a user context** (same model as [@reality.eth/twitter-bot](https://www.npmjs.com/package/@reality.eth/twitter-bot)).

Expected volume is **low** (a handful of posts per day unless markets spike). Design for a **dedicated bot account**, not a human creator’s main profile.

---

## 2. Architecture (Creative TV)

```text
Scheduler (Vercel Cron / QStash / external cron)
    │  Authorization: Bearer CRON_SECRET
    ▼
GET /api/predictions/social-sync/cron
    │
    ├─► Supabase: reality_social_sync_state (cursor per chain)
    ├─► Subgraph: same endpoints as /api/reality-eth-subgraph
    └─► X API v1.1 POST statuses/update (via `twit` + OAuth 1.0a)
```

**Important:** Posting requires **user access tokens** for the bot account. App-only Bearer tokens cannot create posts.

---

## 3. X Developer Portal setup

Portal: **[https://developer.x.com](https://developer.x.com)** (legacy `developer.twitter.com` redirects here).

### 3.1 Prerequisites

| Requirement | Notes |
|-------------|--------|
| X account for the bot | e.g. `@CreativeTVPredict` — use a **dedicated** account |
| Verified phone on that account | Required for developer access |
| Billing / API access | As of 2026, X often routes new developers to **pay-per-use** or paid tiers; confirm your project has **write/post** entitlement before go-live. See [X API documentation](https://docs.x.com). |

### 3.2 Create a Project and App

1. Sign in at [developer.x.com](https://developer.x.com) with the **bot** account (or org owner, then attach the bot).
2. **Create Project** — name e.g. `Creative TV Predictions`.
3. **Add App** inside the project — e.g. `creativetv-reality-social`.
4. Record the app’s credentials (next section).

Credentials always belong to the **App**; v2-style products expect the app to live inside a **Project**.

### 3.3 Enable user authentication (OAuth 1.0a)

In the app → **User authentication settings** → **Set up**:

| Setting | Value |
|---------|--------|
| App permissions | **Read and write** (required to post) |
| Type of App | **Automated App** or **Web App** (if automated is available, prefer it for bots) |
| OAuth 1.0a | **Enabled** |
| OAuth 2.0 | Optional (not used by current Creative TV code) |

**Callback / redirect URLs:** For a **pure server bot** that uses pre-generated access tokens (no browser login flow), you still must save valid placeholder URLs if the portal requires them, e.g.:

- `https://creativetv.xyz/api/auth/callback/twitter` (unused by cron, but satisfies portal validation)

**After changing permissions:** Regenerate **Access Token and Secret** (Section 3.4). Old tokens keep the old permission scope.

### 3.4 Generate the four secrets

In **App → Keys and tokens**:

| Portal label | Creative TV env var |
|--------------|---------------------|
| API Key (Consumer Key) | `TWITTER_CONSUMER_KEY` |
| API Key Secret (Consumer Secret) | `TWITTER_CONSUMER_SECRET` |
| Access Token | `TWITTER_ACCESS_TOKEN` |
| Access Token Secret | `TWITTER_ACCESS_TOKEN_SECRET` |

Steps:

1. Copy **API Key** and **API Key Secret** (regenerate if exposed).
2. Under **Authentication Tokens**, **Generate** Access Token and Access Token Secret **while logged in as the bot account** (or use “OAuth 1.0a” flow once if the portal requires re-authorization after scope change).
3. Store all four values in your **production secret manager** (Vercel Environment Variables). Never commit them to git.

### 3.5 Use case description (portal)

When prompted, describe something close to:

> Automated announcements for Creative TV prediction markets on Base (Reality.eth): new community questions and finalized outcomes, linking back to our site for transparency. No DMs, no following automation, no spam.

Keep this aligned with actual behavior — portal use case is contractually binding.

---

## 4. Creative TV environment variables (production)

### 4.1 Required for X posting

| Variable | Required | Description |
|----------|----------|-------------|
| `TWITTER_CONSUMER_KEY` | Yes | API Key |
| `TWITTER_CONSUMER_SECRET` | Yes | API Key Secret |
| `TWITTER_ACCESS_TOKEN` | Yes | User access token for bot account |
| `TWITTER_ACCESS_TOKEN_SECRET` | Yes | User access token secret |
| `CRON_SECRET` | Yes | Shared secret for cron routes (likely already set) |

### 4.2 Required for the cron job to function (not X-specific)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Writes sync cursor to `reality_social_sync_state` |
| Subgraph vars | Same as predictions (`GRAPH_STUDIO_CREATIVE_PLATFORM_URL`, etc.) |

Apply migration: `supabase/migrations/20261001120000_reality_social_sync_state.sql` (RLS on with no client policies; `service_role` only via explicit `GRANT`; `updated_at` maintained on update via trigger and in app upserts).

### 4.3 Optional tuning (Twitter)

| Variable | Default | Purpose |
|----------|---------|---------|
| `REALITY_SOCIAL_ENABLE_TWITTER` | `true` | Set `false` to disable X while testing Mastodon later |
| `REALITY_SOCIAL_ENABLE_MASTODON` | `true` | Set `false` until Mastodon is ready |
| `REALITY_SOCIAL_SITE_URL` | `NEXT_PUBLIC_SITE_URL` | Canonical links in tweets |
| `REALITY_SOCIAL_CHAIN_IDS` | `8453` | Base only today |
| `REALITY_SOCIAL_NOOP` | `false` | `true` = dry-run (no HTTP call to X) |
| `REALITY_SOCIAL_MAX_POSTS_PER_RUN` | `5` | Cap per cron invocation (max `25`) |

---

## 5. API surface used by Creative TV

| Item | Value |
|------|--------|
| Client library | [`twit`](https://www.npmjs.com/package/twit) ^2.2.11 |
| HTTP API | **Twitter API v1.1** `POST https://api.twitter.com/1.1/statuses/update.json` |
| Auth | **OAuth 1.0a** (HMAC-SHA1 request signing inside `twit`) |
| Body | `status` = tweet text (≤ ~180 chars body + URL in our formatter) |

We intentionally match **@reality.eth/twitter-bot** behavior. Migrating to **API v2** `POST /2/tweets` would be a separate engineering change (OAuth 2.0 PKCE or OAuth 1.0a with JSON body).

---

## 6. Deployment checklist (same day)

### Step A — Database

1. Run Supabase migration `20261001120000_reality_social_sync_state.sql` on production.

### Step B — Vercel (or host) secrets

Add the four `TWITTER_*` variables to **Production**. Redeploy if the app already running.

Suggested while Mastodon is pending:

```env
REALITY_SOCIAL_ENABLE_TWITTER=true
REALITY_SOCIAL_ENABLE_MASTODON=false
REALITY_SOCIAL_SITE_URL=https://creativetv.xyz
```

### Step C — Initialize cursor (once)

Prevents backfilling every historical Reality.eth question:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://creativetv.xyz/api/predictions/social-sync/cron?init=1"
```

Expect JSON `{ "ok": true, ... }`. With no new markets since `init`, `posted` may be `0`.

### Step D — Dry run (optional)

```env
REALITY_SOCIAL_NOOP=true
```

Trigger cron; logs show tweet text without calling X. Set `REALITY_SOCIAL_NOOP=false` for live posts.

### Step E — Schedule

Wire a scheduler to hit:

```http
GET /api/predictions/social-sync/cron
Authorization: Bearer <CRON_SECRET>
```

Example: every **15 minutes** via [Upstash QStash](https://upstash.com/docs/qstash) (recommended if Vercel cron slots are full). This route is **not** added to `vercel.json` by default.

### Step F — Live smoke test

1. Create a **test prediction** on staging/production (or wait for a real market).
2. Run cron manually without `init`.
3. Confirm post on the bot profile and link opens `/predict/{id}`.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `503` “No social credentials configured” | Missing Twitter env vars | Set all four `TWITTER_*`; disable Mastodon with `REALITY_SOCIAL_ENABLE_MASTODON=false` |
| `401 Unauthorized` on cron | Wrong `CRON_SECRET` | Match Vercel env and `Authorization` header |
| `403` or `453` from X | App lacks write access or account restricted | Regenerate tokens after **Read and write**; check API billing tier |
| `401` from X on post | Invalid or revoked tokens | Regenerate Access Token + Secret in portal |
| Duplicate flood of old markets | Skipped `?init=1` | Call `init=1` once, or manually adjust `reality_social_sync_state.last_timestamp` in Supabase |
| `No social sync state for chain 8453` | No init row | Run cron with `?init=1` |
| Tweet text truncated | By design for X length | See `lib/reality-social/format-post.ts` |

---

## 8. Security & operations

- **Rotate** API keys if leaked; update Vercel env and redeploy.
- Restrict `CRON_SECRET` to scheduler + ops — never expose to the browser.
- Use a **bot account**, not a personal or brand main account.
- Monitor X **account-level post caps** (API limits plus platform-wide daily post limits for unverified accounts).
- Review [X Developer Policy](https://developer.x.com/en/developer-terms/agreement-and-policy) and automation rules periodically.

---

## 9. Out of scope (follow-ups)

- Mastodon: see `scripts/reality-social/README.md` (separate spec later).
- OAuth 2.0 / v2 `POST /2/tweets` migration.
- Media attachments or quote-tweets in bot posts.
- Reply threads or @-mentions automation.

---

## 10. Reference links

| Resource | URL |
|----------|-----|
| X Developer Portal | https://developer.x.com |
| X API docs | https://docs.x.com |
| Creative TV cron handler | `app/api/predictions/social-sync/cron/route.ts` |
| Tweet formatter | `lib/reality-social/format-post.ts` |
| Upstream reference bot | https://www.npmjs.com/package/@reality.eth/twitter-bot |
