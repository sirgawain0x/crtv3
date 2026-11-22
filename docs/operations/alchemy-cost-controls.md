# Alchemy cost controls

TL;DR: Keep free gas sponsorship paused at Alchemy. Application guards are a second layer; browser-visible API keys and policy IDs can be used directly against the provider.

## Runtime policy

- Production Platform API gates cannot be disabled by a missing or false `PLATFORM_API_ACCESS_ENABLED` flag.
- First-party browser hints must be accompanied by a human BotID Basic result. Same-site headers, verified crawler status, and production firewall bypass results do not grant free API access.
- Server-only admin or named internal credentials permit our services, subject to rate limits. External partner credentials still require payment.
- External callers use x402 v2 `PAYMENT-SIGNATURE` authorizations on Base USDC. The server verifies and settles exclusively through Coinbase's hosted CDP facilitator, reserves each authorization before settlement, and returns `PAYMENT-REQUIRED` / `PAYMENT-RESPONSE` headers. Old `X-Payment-Proof` / `X-PAYMENT` headers do not grant Platform API access.
- Payment does not replace wallet/session/owner authorization enforced by handlers. Webhooks and cron jobs keep their machine-specific authentication.
- Both public and internal playback aliases use the same gate. The shared route inventory also configures matching Basic BotID client instrumentation and payment CORS preflights.

## Gas switches

`NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED` defaults off unless exactly `true`. MeToken creation, attestations, Story gas contexts, wallet call capabilities and swap quotes respect this switch. The hard-coded attestation policy fallback was removed.

`NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED` independently controls token-paid gas. Leave it off until provider token rules, recipient, reimbursement and spend caps have been reviewed. With both switches off, user wallet transactions require native gas funds.

`ALCHEMY_SERVER_SWAPS_ENABLED` defaults off. Even when enabled, `/api/swap/execute` requires an admin key because it spends from the server-held wallet. Ordinary users must execute swaps from their own wallets.

Browser environment switches are compiled into the client build. Changing them requires a deployment. Pausing an Alchemy policy also protects against old clients and direct calls, subject to already-approved/in-flight operations.

## Shared rate limits

Set server-only `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to use atomic counters across Vercel instances. Set `RATE_LIMIT_REQUIRE_SHARED_STORE=true` after configuration to reject requests if shared storage is absent. A configured store failure always fails closed; it does not silently fall back to per-instance limits. Without shared-store configuration, local counters are only a best-effort layer, not a global spending cap.

Default buckets separate routes and normalize the guarded dynamic route patterns so changing token addresses does not reset a bucket. Internal/admin keys have separate bounded buckets. Invalid payment proof traffic is limited before receipt RPC verification. Malformed/oversized proofs are rejected locally.

## Production rollout

1. Keep the live Creative TV free gas policy inactive. On November 22, 2026 its provider state was changed from Active to Inactive and visibly verified. The existing USDC-paid policy was left active. This does not pause other apps' policies in the shared Alchemy account.
2. Set policy-side total, per-wallet and per-operation caps; inspect other apps contributing to the shared gas balance. Do not infer bot abuse from an invoice alone.
3. Restrict browser and server API keys separately at Alchemy. Origin allowlists are one layer and do not authenticate an arbitrary HTTP client. Keep private keys server-side and use provider method/network restrictions where available.
4. Configure named internal service keys (`CREATIVE_PLATFORM_INTERNAL_API_KEYS=id:secret`) privately on both caller and server. Never ship these keys in a browser bundle. Existing external partner keys no longer receive a free exemption.
5. Verify the Base USDC recipient, resource prices, receipt table's transaction-hash uniqueness, and shared rate store in the deployment environment.
6. Carry this patch onto the reviewed release revision, preserving unrelated workspace changes. Check TypeScript, tests, production compilation and preview behavior before rollout. The release branch `codex/x402-staging-release` is isolated from the older checkout and based on staging commit `0e8f803ff3d3fffe9974113307e46f5aecba4872`. Newer staging stream ownership and video-provider checks are preserved.
7. Preview smoke: ordinary browser playback/membership/session flows; unpaid machine gets 402 before upstream work; spoofed browser bot has no free bypass; internal bot succeeds only with its secret; paid proof works once; replay is denied; expensive Story RPC methods are blocked. Check mobile browsers and embeds for BotID compatibility.
8. Verify provider metrics after release. Already incurred or in-flight gas can still settle after pausing. Record a rollback deployment, but do not reactivate free sponsorship as part of an application rollback.

The receipt migrations and a zero-traffic gateway staging revision have been deployed. Production app rollout, gateway traffic promotion, provider allowlist changes and live wallet-paid E2E verification remain pending. Provider-wide spend attribution still needs dashboard data.

## Coinbase facilitator and Hermes gateway release gates

G2 selected the Hermes Safe treasury `0xf46F1BA19A9280F752a451d0973b047D81c63D70` for Creative TV payments. Local server configuration and browser feature-payment recipients now match it. Update the production `X402_API_RECIPIENT` to this exact address before releasing; stale recipients fail closed.

G2 selected Coinbase's hosted facilitator instead of operating a mainnet gas wallet. Set `X402_FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402`, `CDP_API_KEY_ID`, and `CDP_API_KEY_SECRET` on the server. The existing Coinbase SDK generates separate short-lived JWTs scoped to the method, host and path for `/supported`, `/verify`, and `/settle`. No alternate provider fallback is allowed. Do not put credentials in browser variables. The previous custom-facilitator bearer token is no longer used.

The authenticated Coinbase `/supported` read on November 22 confirmed x402 v2 exact Base mainnet support. No self-hosted signer funding or mainnet upgrade is required. Coinbase's published facilitator fee is free for the first 1,000 onchain transactions per month and $0.001 per additional transaction; gas is covered by that fee. Track merchant settlement fees as well as AI/hosting costs, and retain the app's rate limits. This is not a configured account-wide spending cap.

The live Hermes gateway at `https://hermes-x402-gateway-1037240986506.us-central1.run.app` uses Coinbase settlement, Base mainnet and the approved Safe. The Creative TV route has been deployed to a tagged staging revision, `hermes-x402-gateway-crtv-x402-20261122`, at `https://crtv-x402-staging---hermes-x402-gateway-3ortoh2aiq-uc.a.run.app`. All normal gateway traffic remains on `hermes-x402-gateway-00005-h5j` until promotion.

The gateway now provides:
- `POST /v1/internal/creative-tv`: dedicated server-only `CREATIVE_TV_APP_API_KEY` bearer credential; no public free access.
- `POST /v1/x402/creative-tv`: $0.01 Base USDC, approved Safe, `paymentFlow: upfront`. Settlement must succeed before AI runs. No automatic retry of ambiguous settlement results.
- An advertised `creative-tv` skill; input/body limits, 1,024 output tokens and a 90-second upstream deadline.

The app adapter now uses the internal gateway route with `HERMES_GATEWAY_API_KEY`, rather than exposing the backend Hermes key to the app. For staging, point `HERMES_X402_GATEWAY_URL` at the tagged URL. The dedicated credential is in GCP Secret Manager, `creative-tv-gateway-internal` version 1; only the gateway service account was granted access by this release. Configure the matching value privately in the app's branch preview, then use the canonical gateway URL after gateway promotion. Never place either credential in a public variable or the browser.

On November 22, both receipt migrations were applied to the connected Supabase project: `20261122173608_secure_x402_payment_receipts.sql` and `20261122173706_restrict_x402_receipt_service_permissions.sql`. RLS is enabled; `anon` and `authenticated` cannot access receipts; `service_role` has SELECT/INSERT only. A live transaction verified global duplicate rejection and rolled back all test rows. Supabase default grants initially gave the service role broad access, so the second migration explicitly removes those grants. No existing app records were modified.

Keep these migrations during rollback. Never delete reservations automatically after ambiguous settlement timeouts. Reconcile the transaction instead of resubmitting it. No payment may proceed if replay reservation storage fails.

`pnpm exec tsx scripts/check-x402-readiness.ts` makes read-only checks of facilitator networks, receipt-store availability, and Hermes health/discovery. It fails until these release gates are met. It does not submit a transaction or spend funds.

Feature payments now use `/api/payments/x402`, which enforces service prices and the Safe recipient server-side. The browser signs from its connected funding wallet; that address needs Base USDC. It does not automatically move tokens from the smart account or spend from a server-held payer key. Feature receipt redemption is one-use. Review smart-account funding UX in staging before release.

## Verification evidence and remaining release steps

- App: 205 test files / 1,106 tests passed; TypeScript and the full production build passed. Changed-file lint passed with TypeScript undefined-name checking and the existing React Hooks inline directives supported; existing unused-variable warnings remain. Browser preview verification is still a separate gate.
- Gateway: seven tests passed, including real SDK payment challenge and mocked upfront settlement/replay behavior; typecheck and build passed.
- Live gateway staging: health/manifest passed; unpaid calls returned 402; anonymous private calls returned 401; one authenticated Creative TV call returned 200 and an answer. No paid settlement was submitted by these smoke checks.
- Vercel CLI deployment access expired; reconnect the account before setting branch preview secrets and creating the app preview. The connected Vercel API could not access this project either.
- Before promotion: verify browser playback, membership, wallet funding/signing and BotID on the preview; run a single wallet-approved paid call and replay check; verify shared rate limits; record deployment IDs and rollback targets.
- Gateway promotion uses the exact tested revision, never `latest`: `gcloud run services update-traffic hermes-x402-gateway --project creative-ai-491118 --region us-central1 --to-revisions hermes-x402-gateway-crtv-x402-20261122=100`. Gateway rollback target is `hermes-x402-gateway-00005-h5j`. Keep free gas sponsorship inactive on rollback.

Release review: https://github.com/sirgawain0x/crtv3/pull/460 (draft, base staging). GitHub started the branch preview automatically; it still needs branch-scoped runtime configuration and browser/payment verification. The original checkout remains unchanged by the release port.

The built production app was also served locally for an API smoke test: unpaid AI request → 402 to the approved Safe; spoofed browser headers → 503 when hosted BotID was unavailable; own-agent key without wallet proof → 401; temporary own-agent key plus a locally signed ephemeral EOA proof → 200 through the staging gateway and real Creative TV model. The ephemeral account had no funds, no payment was signed, and no chain transaction was submitted. This verifies the server path, not the hosted human-browser or paid-wallet flows.
