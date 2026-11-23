# FrameWorks staging webhook verification

TL;DR: staging is deployed, but an external caller is redirected to Vercel login. Local signed-event route tests can run without credentials or database writes. Registering/updating the real endpoint, changing Preview access, setting secrets, and tests that write to the shared database retain G2's separate approval gates.

Related to #401, #406, and #409. No closing keywords for #401 or #405.

## Verified checkpoint

- Staging: `05c320e00bb99ebccfd479e3d501212d8e56b98e`.
- Preview deployment: `dpl_8SEhhqWy3dSreV68abZj9NvX4WPH`, READY.
- Base webhook address: `https://crtv4-git-staging-creative-projects.vercel.app/api/livepeer/webhook`.
- All Preview deployments remain covered by Vercel SSO protection.
- A read-only GET to that address without authentication and without following redirects returned HTTP 302 to `vercel.com`, not the application's expected method rejection. The previously successful authenticated homepage check does not establish external webhook reachability.
- The local Vercel CLI is logged out; the connected Vercel tool can make authenticated GETs, but its fetch operation does not expose a POST/body option. Do not obtain decrypted Vercel variables to work around this.

No real endpoint registration, secret rotation, protection setting change, signed remote POST, or database write was performed in this checkpoint.

## Local verification that is safe to run now

Use a clean checkout of this change with its locked dependencies:

```bash
npx next typegen
npx tsc --noEmit
npx vitest run app/api/livepeer/webhook/route.frameworks.integration.test.ts
npx vitest run
node --test tools/frameworks-webhook-relay/test/*.test.mjs
```

The integration test imports the actual route, provider selector, HMAC verifier, webhook handler, and instance-local dedupe. It replaces only the external provider, persistence, and logging boundaries. Every test generates an ephemeral signing key locally; no deployed secret is read or emitted and no HTTP request is sent.

Checks:

| Case | Expected |
| --- | --- |
| Signed `webhook.test` | 200; no provider call or database write |
| Same JSON with an added newline after signing | 401; no external work; later valid attempt still accepted |
| Signed event older/newer than the five-minute tolerance | 401; no external work |
| Event signed with another endpoint's key | 401; no external work |
| Multiple signatures with one match | 200 |
| Signed `stream.live` and `stream.idle` | Correct persistence boundary called once; repeat in the same instance returns 204 |
| Signed `recording.ready` | Accept the public v1 `artifact.artifactId` payload, resolve and preserve the provider hash as asset ID, persist once; a failed lookup returns 500 and can retry successfully |

These tests establish local behavior. They do not validate the deployed secret, the FrameWorks account/token, network delivery, Supabase grants, or cross-instance dedupe.

This change includes the nine route integration cases, a standalone undeployed relay, its Node tests/deployment configuration, and CI/operator documentation. The relay is isolated under `tools/frameworks-webhook-relay`; it is not automatically hosted by the crtv4 application Preview. Local commands exercise the tests without cloud access. TypeScript and all app/relay suites must pass on the reviewed head; hosted relay behavior is a later, separately approved verification gate.

## Endpoint signing-secret prerequisite

FrameWorks generates an endpoint-specific signing secret at endpoint creation and returns it once. Its create input has URL, description, event types, and API version; it does not accept a caller-selected signing secret. Therefore the existence of `FRAMEWORKS_WEBHOOK_SECRET` in Vercel does not establish that it matches the eventual endpoint.

G2 confirmed the endpoint already exists, currently targets `https://tv.creativeplatform.xyz/api/livepeer/webhook`, and its signing secret is set in staging. Secret confirmation is complete. Its ID is only needed for API operations; G2 can update the endpoint directly through the dashboard without sharing the ID. Never request its secret or a credential-bearing URL in chat.

- If it exists, confirm the secret stored privately in staging is the secret from that endpoint.
- If it does not exist, obtain approval to register it, then G2 privately copies the generated secret into staging's Preview variable and approves the required redeploy. Do not select the secret field in a query whose result will be shown in tool output or chat.
- If an existing secret was lost, do not rotate it as part of this work. Rotation needs separate G2 approval and invalidates active upload tickets that use the same secret.

The intended event subscription is `stream.live`, `stream.idle`, `recording.ready`, `upload.ready`, and `clip.ready`, with public API version `v1`. Register before importing or moving traffic; events predating endpoint creation are not backfilled.

## External access decision — requires review before changing anything

The FrameWorks API and sender at upstream commit `11c40d55ac8ede27df0ceb10d62048c0dd4010e9` do not expose custom endpoint headers. The sender sets Standard Webhooks headers, Content-Type, and User-Agent. A plan that merely tells FrameWorks to add `x-vercel-protection-bypass` as a header is not currently executable against that interface.

Vercel documents a query-parameter automation bypass for senders without custom headers. However, that puts a credential into the registered URL and can expose it to URL/access/delivery logs. Do not silently adopt it under the migration's prohibition on logging secrets or signed URLs. It needs an explicit access/secret-handling decision from G2; never assemble or display a real bypass URL in chat, source, CLI arguments, or this document.

Prepared access proposal and alternative:

1. A dedicated public webhook-only relay with a fixed staging destination is now prepared under `tools/frameworks-webhook-relay`. It verifies the original HMAC and timestamp, bounds request size and time, preserves the exact body and signed headers, and forwards with a privately stored bypass header. It does not log credentials or raw URLs. Its README specifies the exact proposed project, private environment names, project-scoped bypass credential, account update, and approval gates. It is not deployed. This requires review and infrastructure/secrets/build/spend approval before provisioning.
2. A narrowly scoped staging access exception, only if the available Vercel controls support the agreed scope. Verify whether it exposes a whole hostname rather than only a route before proposing it. Auth/access changes require G2's approval. Do not disable protection across the project.

No relay, bypass credential, domain, access exception, or new project has been created. Existing agent authentication is suitable for agent checks, not a credential to hand to FrameWorks.

## Remote tests, after access and endpoint approval

### Phase A: signature/delivery proof without Supabase writes

FrameWorks' `testWebhookEndpoint(id)` sends a signed `webhook.test` once and returns an attempt result. It can test a disabled endpoint and is limited to one test per endpoint per ten seconds. The current application ignores this event after verification and only updates its in-memory dedupe map.

After G2 approves the FrameWorks account action:

1. Use Developer → Webhooks → the approved endpoint → Test, or the documented `testWebhookEndpoint` mutation, through a privately authenticated operator session.
2. Request/store only endpoint ID, event/delivery ID, timestamp, status, and latency. Exclude endpoint URL, response excerpt, request headers, signing secret, and raw body from published evidence.
3. Require a 2xx response from the application, not a Vercel login page or redirect.
4. In a separately authenticated test client with privately supplied signing material, send an otherwise valid event with a changed body byte; require 401. Also test an expired timestamp. Never capture signatures/keys/full requests in the test report.

The provider's Test button proves a valid delivery only. It does not itself prove rejection of tampered/stale events. Local tests cover those cases until the approved remote test client is available.

### Phase B: Supabase persistence proof

G2 must approve the shared-database test writes after a verified backup. Prepare designated test records, their original state, exact expected writes, and a rollback/cleanup plan. Cleanup is also a data mutation and must be covered by approval.

| Event | Current application behavior | Required evidence |
| --- | --- | --- |
| `stream.live` | Mark stream live by provider stream ID | Only designated test stream changes |
| `stream.idle` | Mark stream offline | Only designated test stream changes |
| `recording.ready` | Provider lookup, ready/recording check, then persistence keyed by artifactHash | Correct test asset row, retry behavior, no duplicate recording |
| `upload.ready` | Provider lookup only; does not directly write Supabase | Trace the upload completion/polling path and prove how the existing asset row becomes ready; do not claim this webhook writes the row |
| `clip.ready` | Provider lookup only; does not directly write Supabase | Trace the clip creation/polling path and prove final row state; resolve the gap with #406/#409 before cutover |

The supplied migration spec says all five events update Supabase. The current handler does not directly persist upload/clip events; that acceptance criterion remains unresolved until the complete application flows are verified or a reviewed change supplies the missing behavior.

Dedupe remains a per-instance in-memory map. A successful repeated delivery in one instance does not prove durable exactly-once behavior across Vercel instances. Require explicit risk acceptance or a reviewed durable idempotency change before production.

## Evidence and rollback

Record the exact staging SHA/deployment, whether the request came from FrameWorks or a local test client, test case, HTTP result, endpoint/event/delivery IDs, and affected test-row IDs. Report local and deployed checks separately.

Rollback only the new endpoint/access configuration and approved test mutations. Preserve the Livepeer endpoint. Do not delete endpoints, rotate secrets, restore environment values, or change production without their explicit approval gates. Disabling an endpoint is an account change too.

## Sources

- [FrameWorks webhook guide, pinned source](https://github.com/Livepeer-FrameWorks/monorepo/blob/11c40d55ac8ede27df0ceb10d62048c0dd4010e9/website_docs/src/content/docs/builders/webhooks.mdx)
- [FrameWorks endpoint API fields, pinned source](https://github.com/Livepeer-FrameWorks/monorepo/blob/11c40d55ac8ede27df0ceb10d62048c0dd4010e9/website_docs/src/content/docs/builders/api-schema/webhooks.mdx)
- [FrameWorks outbound HTTP sender, pinned source](https://github.com/Livepeer-FrameWorks/monorepo/blob/11c40d55ac8ede27df0ceb10d62048c0dd4010e9/api_webhooks/internal/delivery/http.go)
- [Vercel automated access and credential-in-URL warning](https://vercel.com/docs/deployment-protection/automated-agent-access)
