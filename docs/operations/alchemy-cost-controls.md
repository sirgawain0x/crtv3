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

## Release state — November 22, 2026

The production candidate is isolated on `codex/x402-production-release`, based on main `465d186c3c788dc8ba30863628fa19e1b99a07d1`. It carries the cost/payment fixes from PR #460 and the existing-Coinbase-credential compatibility from PR #461. The unreleased FrameWorks provider migration is excluded. The current production video provider remains intact; recording changes retain wallet ownership/delegation checks and conditional persistence from the tested staging route.

The candidate also requires an explicit boolean BotID verdict: the installed SDK can turn an upstream JSON error into `isHuman: true` with a missing `isBot` field. Such malformed verdicts cannot grant free access. Invalid payment signatures returned as SDK `VerifyError` HTTP 400/402 become a normal payment rejection. Authentication failures stay unavailable; only errors after a settlement attempt are described as potentially pending.

An admitted market server query uses the configured subgraph upstream directly, with existing server authentication and a timeout, instead of re-entering the newly paid public app proxy. This creates no additional free HTTP entry point.

### Existing credentials

The facilitator uses one complete credential pair, in this order:
1. `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET`.
2. Existing onboarding names `CDP_API_KEY` + `CDP_API_SECRET`.
3. `COINBASE_CDP_API_KEY_ID` + `COINBASE_CDP_API_KEY_SECRET`.

A partial selected pair fails closed. IDs and secrets from different pairs are never combined. The facilitator remains pinned to `https://api.cdp.coinbase.com/platform/v2/x402`; no alternate-provider fallback is allowed. Credentials are server-only.

The app's `HERMES_GATEWAY_API_KEY` matches GCP Secret Manager `creative-tv-gateway-internal` version 1. G2 explicitly approved copying that existing dedicated key into Vercel project crtv4 staging server-only secrets; that transfer is complete. Temporary transfer files were deleted. The production target has not yet been configured with the key by this task.

### Gateway

The tested staging revision is `hermes-x402-gateway-crtv-x402-20261122` at:
`https://crtv-x402-staging---hermes-x402-gateway-3ortoh2aiq-uc.a.run.app`.

It provides `POST /v1/internal/creative-tv` using the dedicated app credential and `POST /v1/x402/creative-tv` charging $0.01 Base USDC to Safe `0xf46F1BA19A9280F752a451d0973b047D81c63D70`. Public payment uses upfront settlement before AI. Input/body limits, a 1,024-token output budget and a 90-second upstream deadline bound each request. The Creative TV skill is advertised. Existing unrelated gateway routes are preserved.

The canonical gateway is `https://hermes-x402-gateway-1037240986506.us-central1.run.app`. Its normal traffic remains on `hermes-x402-gateway-00005-h5j` until the tested revision is promoted. Keep the app's preview URL pointed at the tagged revision until promotion.

### Replay ledger

Both migrations are applied to connected Supabase project `zdeiezfoemibjgrkyzvs`:
- `20261122173608_secure_x402_payment_receipts.sql`
- `20261122173706_restrict_x402_receipt_service_permissions.sql`

Live catalog checks confirmed RLS, no anon/authenticated access, SELECT/INSERT-only service access and a global transaction-hash primary key. A duplicate test across different resources was rejected; all test writes were rolled back. Supabase defaults initially gave the service role broader grants, so the second migration explicitly removes them.

Preserve the ledger on rollback. Never remove authorization reservations after ambiguous settlement timeouts; reconcile the transaction instead of submitting it again. Storage failure cannot grant payment access.

### Verification

- Original staging release: 205 test files / 1,106 tests, TypeScript and full build passed. The naming compatibility change subsequently passed 18 facilitator tests and TypeScript.
- Isolated production candidate: 174 test files / 866 tests and TypeScript passed. Changed-file lint passed using TypeScript undefined-name checks and the React Hooks plugin required by existing directives; existing unused-variable warnings remain.
- Gateway: seven tests passed, including real SDK payment challenges and mocked upfront-settlement/replay behavior. Typecheck/build passed.
- Live gateway checks passed again after staging configuration: approved Safe, Base, Coinbase, public 402, private 401 and authenticated Creative TV answer.
- Staging merge `9a67c151b4bea19e78509abae7130ffae91827b6` deployed READY as `dpl_8m5V9qRQoYti1K7mbCvYrQehja3q`. The corrected API returns a 402 Base USDC Safe challenge. The human browser's market API returns 200; the predictions list renders the question title and resolved answer.
- The live invalid-signature probe exposed the SDK VerifyError classification described above; the production candidate fixes it and has regression coverage. No real payment was signed or submitted during these probes.
- Earlier built-app smoke: unpaid AI request returned 402; spoofed browser hints failed closed; an own-agent credential without wallet proof returned 401; a locally signed ephemeral EOA proof plus temporary own-agent key traversed app → staging gateway → Creative TV AI and returned 200. The temporary account had no funds and signed no payment.

### Remaining promotion gates

1. Verify the isolated production candidate's hosted build and invalid-signature probe, then run one wallet-approved paid request and confirm replay denial. Do not treat a protected-preview login page as an application response.
2. Review global rate limits. Neither preview nor production currently advertises Upstash/Redis variables in project metadata. Local counters are not a distributed spending cap. No new paid rate-limit service has been provisioned.
3. Configure production server-only Hermes access and public Safe/CDP/gas-off settings. Reuse the existing Coinbase credentials. Keep sponsorship switches and server-funded swaps off.
4. Promote the exact tested gateway revision, then deploy the reviewed production candidate using production settings. Do not directly promote a preview carrying staging-only secrets or the unreleased streaming migration.
5. Verify production challenge/receipt behavior and monitor Alchemy and model usage. Provider-side origin/method/network restrictions and account-wide spend attribution remain separate controls; public browser provider keys cannot be secured solely by app middleware.

Gateway promotion: `gcloud run services update-traffic hermes-x402-gateway --project creative-ai-491118 --region us-central1 --to-revisions hermes-x402-gateway-crtv-x402-20261122=100`.
Gateway rollback target: `hermes-x402-gateway-00005-h5j`.
Production rollback deployment recorded before this release: `dpl_GFpJQU4TyoYwBqaSqDDEmiiE1kbB`; recheck its eligibility before rollout. Never reactivate free gas sponsorship as part of an app rollback.

`node --import tsx scripts/check-x402-readiness.ts` performs read-only facilitator, receipt-store and gateway checks. It does not transfer funds. Feature payments use `/api/payments/x402` and the connected funding-wallet signer, which needs Base USDC; payment redemption is one-use.
