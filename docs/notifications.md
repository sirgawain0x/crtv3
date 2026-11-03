# Notifications

Video comments notify the video's creator. Replies also notify the parent comment's author. Self-notifications are excluded and recipients are deduplicated. Other activity sources can insert notifications through trusted server code; predictions, follows, and upcoming events are not notification sources in this release.

## Setup

1. Apply `20261102000000_create_notifications.sql`, followed by `20261103000000_notification_delivery.sql`, through the normal Supabase migration process. The existing `video_assets` and `video_comments` tables must already exist.
2. Configure `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` on the server. Notification tables and queue RPCs deny direct anonymous/authenticated access; the API verifies the wallet signature and derives its owner from that proof.
3. Generate VAPID keys locally with `web-push generate-vapid-keys` and configure `PUSH_VAPID_PUBLIC_KEY` and `PUSH_VAPID_PRIVATE_KEY` in the deployment environment. Keep the private key server-side. Keep keys stable: rotating the public key requires devices to re-subscribe.
4. Configure `CRON_SECRET`. Vercel invokes `/api/notifications/dispatch` every five minutes with `Authorization: Bearer <CRON_SECRET>`. Missing or invalid credentials return 401.
5. Deploy the code, open Notifications, verify the wallet, and enable push with a user gesture. On iOS/iPadOS, use the installed Home Screen app. Use “Send a test to enabled devices” to request an immediate attempt; a provider acceptance does not prove the operating system displayed the alert.

No migration or environment provisioning is performed by opening or merging the PR. Without VAPID keys the in-app inbox remains available and push controls report that setup is unavailable. Without the database configuration the API returns 503 rather than claiming an empty inbox.

## Delivery

Database triggers create a notification and its device deliveries in the same source transaction. Subscribing does not replay historical unread activity. A maximum of five enabled devices is enforced transactionally per wallet. A subscription endpoint cannot be moved to another wallet.

The dispatcher claims up to 20 eligible deliveries with `FOR UPDATE SKIP LOCKED`. A five-minute lease and a fresh claim token protect each attempt; stale workers cannot acknowledge a newer claim. Crashed claims become eligible again after the lease expires. Five attempts are allowed, with exponential retry delay. The cron's five-minute cadence means retries may run later than the delay.

Reading a notification or disabling its subscription cancels queued deliveries. Sends already accepted by a push provider cannot be recalled. HTTP 404/410 disables an expired endpoint. Failures are persisted; database errors are surfaced rather than reported as successful sends. Delivery is at-least-once: a crash after provider acceptance can cause a retry, and stable notification tags coalesce alerts on the device.

`public/push-sw.js` is a standalone static worker available even when Vercel disables PWA generation. Its `/notifications/` registration scope leaves the application's root offline worker intact. Push handlers do not require an open controlled page. Alerts contain generic text, and clicks only navigate to permitted local notification/video paths.

## Verification

`vitest run lib/notifications-database.test.ts lib/notifications.test.ts lib/push-worker.test.ts app/api/notifications/route.test.ts` exercises the real SQL migrations using PGlite, the delivery sender with a mock provider, API ownership/error contracts, and worker events. These tests do not send network pushes or apply migrations to a hosted database.

After deployment, verify an actual comment/reply from a second wallet, read/unread behavior, background delivery with the app closed, disabling push, and a fresh subscription after an account switch. A configured production browser/device is necessary for this last check.
