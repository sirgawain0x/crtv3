# Reality.social — X (Twitter) integration

Creative TV’s prediction social-sync cron posts to **X** using the **X API v2** endpoint:

- `POST https://api.x.com/2/tweets`
- JSON body: `{ "text": "<status>" }`
- **OAuth 1.0a user context** signed with app + user tokens (JSON body is **not** part of the OAuth signature base string).

## Environment variables

| Variable | Purpose |
| -------- | ------- |
| `TWITTER_CONSUMER_KEY` | App API key |
| `TWITTER_CONSUMER_SECRET` | App API secret |
| `TWITTER_ACCESS_TOKEN` | User access token |
| `TWITTER_ACCESS_TOKEN_SECRET` | User access token secret |

Optional toggles: see `lib/reality-social/config.ts` (`REALITY_SOCIAL_ENABLE_TWITTER`, `REALITY_SOCIAL_NOOP`, etc.).

## X developer portal setup

1. Create or reuse an app at [console.x.com](https://console.x.com).
2. **Attach the app to a Project** in the developer portal. v2 endpoints (including `/2/tweets`) return **403** if the app is standalone and not linked to a Project.
3. Enable user authentication with **Read and write** permissions and generate the four OAuth 1.0a credentials above.

Implementation: `lib/reality-social/publish-twitter.ts`.

## Verify after deploy

1. Confirm the app is attached to a Project and credentials are set in the deployment environment.
2. Call the cron once with auth:  
   `GET /api/predictions/social-sync/cron` with header `Authorization: Bearer <CRON_SECRET>`.
3. Response should show `posted >= 1` when there are new questions to announce and posting succeeds.

Do not use the legacy v1.1 `statuses/update` endpoint; it is no longer available for new integrations.
