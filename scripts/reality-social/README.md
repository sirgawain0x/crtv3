# Reality.eth social bots (X + Mastodon)

Creative TV can announce new prediction markets on **X (primary reach)** and **Mastodon (free, bot-friendly secondary channel)** using the same subgraph cursor model as the official [@reality.eth/twitter-bot](https://www.npmjs.com/package/@reality.eth/twitter-bot) and [@reality.eth/mastodon-bot](https://www.npmjs.com/package/@reality.eth/mastodon-bot) packages.

## Hosted dual-post (recommended on Vercel)

The app includes **`GET /api/predictions/social-sync/cron`**, which:

- Reads Reality.eth events from the same subgraph routing as `/api/reality-eth-subgraph`
- Links to **`/predict/{questionId}`** on your site (not only reality.eth.limo)
- Appends Mastodon-friendly hashtags (`#OpenData`, `#Decentralized`, `#Predictions`)
- Stores cursor state in Supabase (`reality_social_sync_state`)

### Environment variables

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Bearer token for the cron route |
| `TWITTER_CONSUMER_KEY` / `TWITTER_CONSUMER_SECRET` | X app keys (developer portal) |
| `TWITTER_ACCESS_TOKEN` / `TWITTER_ACCESS_TOKEN_SECRET` | Bot user tokens |
| `MASTODON_INSTANCE_URL` | e.g. `https://mastodon.social` |
| `MASTODON_ACCESS_TOKEN` | App token from Mastodon → Development |
| `REALITY_SOCIAL_SITE_URL` | Public site base (defaults to `NEXT_PUBLIC_SITE_URL` or production URL) |
| `REALITY_SOCIAL_CHAIN_IDS` | Comma-separated chain IDs (default `8453` for Base) |
| `REALITY_SOCIAL_ENABLE_TWITTER` | `true` / `false` (default `true`) |
| `REALITY_SOCIAL_ENABLE_MASTODON` | `true` / `false` (default `true`) |
| `REALITY_SOCIAL_NOOP` | `true` logs payloads without posting |
| `REALITY_SOCIAL_MAX_POSTS_PER_RUN` | Cap posts per invocation (default `5`, max `25`) |

Apply migration `supabase/migrations/20261001120000_reality_social_sync_state.sql`.

### First run

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DOMAIN/api/predictions/social-sync/cron?init=1"
```

`init=1` sets the cursor to **now** so historical markets are not spammed.

Schedule via Vercel Cron, Upstash QStash, or an external scheduler (Hobby plans are limited to two daily crons — QStash is a good fit for `*/15 * * * *`).

## Upstream CLI bots (optional)

For parity with Reality.eth’s maintained scripts, install the official packages locally:

```bash
cd scripts/reality-social
npm install
mkdir -p secrets state
cp config.example.json secrets/config.json   # Twitter
cp config.mastodon.example.json secrets/mastodon-config.json
```

Initialize Base (8453) once per bot:

```bash
node node_modules/@reality.eth/twitter-bot/index.js 8453 init
node node_modules/@reality.eth/mastodon-bot/index.js 8453 init
```

Official bots post **reality.eth.limo** links and use filesystem state under `./state/` — use them if you run a long-lived VM; use the hosted cron for Creative TV branded links and Supabase state.
