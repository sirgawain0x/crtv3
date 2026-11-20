# FrameWorks staging webhook relay

TL;DR: the staging relay is deployed in probe mode. This proposed revision limits future business-event forwarding to live/idle transitions for one approved test stream. The revision is not deployed or enabled.

## Current revision: bounded stream testing

The existing relay project is `crtv3-frameworks-staging-hooks` on team `creative-projects`. G2 reported successful signed probe delivery on November 19. The initial setup proposal below is historical context; do not create another project or bypass credential.

This revision requires both `FRAMEWORKS_RELAY_ALLOW_BUSINESS_EVENTS=true` and `FRAMEWORKS_RELAY_TEST_STREAM_ID` set to the one approved test stream. Only `stream.live` and `stream.idle` with that exact ID (after trimming, as in the staging handler) are forwarded. The configured ID must contain 1–200 printable, non-whitespace ASCII characters after trimming. Missing or invalid configuration fails closed. Recording/upload/clip events, unknown types, and other streams return 503 without forwarding, even when the flag is true. Signed `webhook.test` remains available without either setting.

The flag alone no longer admits business events. This is intentionally narrower than the original proposal below. Testing recording/upload/clip events requires a separate reviewed admission change. The relay does not change the application's own webhook behavior or prevent direct delivery through another authorized access path.

Review and approve the exact code and relay redeploy before using the new variable. Keep the flag `false` during deployment and probe checks. Before enabling stream tests, verify a recoverable backup, designate an operator-owned test stream/row with recording disabled, approve its temporary production-listing visibility and cleanup, and inspect queued deliveries. After the test, return the flag to `false` and redeploy. Blocked events are retried rather than acknowledged; reassess the queue before widening access later.

Retain backup/restore reports, exact fixture IDs and before-state, and conditional cleanup instructions privately outside the public repository. Those records must accompany the separate write-test approval.

## Why this is separate

The staging application is protected by Vercel SSO. The current FrameWorks endpoint interface cannot add a custom Vercel bypass header, and putting the bypass credential in its URL would conflict with the migration's secret-handling requirements.

The proposed relay has a public `/api/webhook` endpoint, without a query parameter. It first verifies the FrameWorks HMAC/timestamp, then adds the privately configured Vercel bypass header only when forwarding to:

```text
https://crtv4-git-staging-creative-projects.vercel.app/api/livepeer/webhook
```

The staging application verifies the signature again. Its existing handler still decides whether to acknowledge or retry. The relay does not access Supabase, contain database credentials, create media, or provide a general proxy. By default it forwards only `webhook.test`; signed business events return 503 without reaching staging. Enabling business-event forwarding requires the separate shared-database backup/approval gate.

## Reviewed boundaries

- Only POST to `/api/webhook`, with no query string and JSON content type.
- Delivery-probe mode by default: only `webhook.test` is forwarded. Business events require explicit enablement; they are not silently acknowledged/dropped while paused.
- Original body bytes and only the three Standard Webhooks headers are forwarded.
- HMAC-SHA256 with the endpoint's 32-byte key, timing-safe comparison, and five-minute timestamp tolerance. An absent or malformed secret fails closed.
- Body cap: 256 KiB, enforced on declared and streamed sizes. Body read timeout: 5 seconds. Upstream timeout: 8 seconds.
- Target is fixed in source; no environment, request URL, headers, or JSON field can redirect delivery to production or another host.
- Redirects are not followed. Only upstream 204 or upstream 200 with a JSON content type is acknowledged. HTML/login pages, other statuses (including other 2xx statuses), and network failures become 502 so FrameWorks can retry.
- No console logging. Upstream body, cookies, headers, error messages, credentials, and URLs are not returned to the caller.
- Static output is restricted to `public/`, which contains only a generic 404 page. README and tests are also excluded by `.vercelignore`; package metadata, source, configuration, and operational notes are outside the static output.
- Dedupe remains the staging app's per-instance behavior. This relay does not make it durable or exactly once.

## Local validation

Requires Node.js 22; no install or external credentials are needed:

```bash
node --test tools/frameworks-webhook-relay/test/*.test.mjs
```

The tests cover raw-byte preservation, fixed destination, header filtering, tampering, malformed and multiple signatures, stale/future events, missing/whitespace configuration, probe-only default and explicit business-event enablement, native Fetch-export environment wiring, malformed event bodies, oversized/chunked/stalled bodies, wrong methods/paths/query strings/content types, JSON charsets/identity encoding, redirects, upstream status/content-type checks, credential redaction, 204 acknowledgements, and the static-output file allowlist. They use generated fixture keys and mocked fetch; no remote requests occur. The repository CI runs this suite after Vitest.

## Concrete deployment proposal — approval required

Proposed project: `crtv3-frameworks-staging-hooks`, team `creative-projects` (`team_9uA5FPSc9BJkiYc1itzFW5f7`). Root directory: `tools/frameworks-webhook-relay`. The committed `vercel.json` selects Framework Other (`null`), skips Install and Build Commands with explicit empty strings, and restricts static output to `public/`. Do not rely on blank dashboard fields with their Override switches off. Node.js 22 is selected by the package engine. The API uses the documented default export with a Fetch handler; there is no body-parsing framework or dependency install.

Review and merge this code into staging under the existing QA/CTO gates before setting that new project's Production Branch to `staging`. Its public production-domain URL will serve the webhook function and a generic error page; it must not serve source or operational files. This is a new project's public deployment, not a promotion of the crtv4 application or its provider switch. Do not deploy an unreviewed branch or accidentally use crtv4 as the target project.

Before provisioning, evaluate [Vercel Trusted Sources](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources) as an alternative: allow only the relay project's `production` environment to access crtv4's `preview` environment, with a short-lived OIDC token in `x-vercel-trusted-oidc-idp-token`. This could replace the project-wide long-lived bypass credential, but requires an approved trust rule and a reviewed change to runtime token acquisition (for example `@vercel/oidc`), dependencies, and tests. The current implementation supports the bypass-header design only. No trust rule, new dependency, or access-design change has been applied by this PR; select the approach with G2 before creating credentials.

G2 approval must explicitly cover:

1. Pushing this branch/creating the review PR and associated automatic Preview build spend.
2. Creating and deploying the dedicated public relay project and its build/function spend.
3. A new crtv4 Protection Bypass for Automation credential. That credential is project-scoped, not intrinsically limited to the webhook route or staging; the relay restricts its use to the fixed staging target. Treat this as an access-control change. Existing bypass credentials must not be rotated or revoked as a side effect.
4. Private environment values on the new relay project's **Production** environment (separate from the crtv4 Production environment):

   | Name | Private source |
   | --- | --- |
   | `FRAMEWORKS_WEBHOOK_SECRET` | The same existing FrameWorks endpoint secret that G2 confirmed is stored in crtv4's staging Preview |
   | `STAGING_VERCEL_BYPASS_SECRET` | The newly approved crtv4 automation-bypass credential |

   G2 enters the existing endpoint secret privately; the agent must not decrypt/export it from Vercel. The custom destination-token name avoids colliding with Vercel's system bypass variable for the relay project's own protection settings. Both secrets are trimmed at their boundaries; empty values or interior bypass-key whitespace still fail closed. If entering values through a privately authenticated CLI session, use `printf %s` rather than `echo` and never expose the literal value in shell history or arguments.
   Leave `FRAMEWORKS_RELAY_ALLOW_BUSINESS_EVENTS` unset (or `false`). Only the exact string `true` enables business events, and setting it requires a separate approval plus a verified backup for the shared-database test writes. Keep the FrameWorks endpoint paused for business deliveries until that gate; otherwise its retry window can expire while the relay returns 503.
5. Updating the **FrameWorks** endpoint currently targeting `tv.creativeplatform.xyz` to the new public relay's `/api/webhook` URL. Preserve its endpoint ID and signing secret. Do not change or delete the separate Livepeer Studio webhook.
6. Running the provider's signed `webhook.test` delivery only, initially. Confirm the relay's canonical production-domain URL accepts external requests rather than redirecting to Vercel login. Production application cutover, stream creation, imports, database-writing events, and changes to crtv4's SSO setting are outside this approval.

Do not paste real credentials, generated credential-bearing URLs, signatures, or token-containing responses into chat or logs. The registered FrameWorks URL for this design is a plain public URL with no secret query parameter.

The endpoint ID is useful for API operations, but G2 can update the endpoint through Developer → Webhooks without sharing its ID with the agent. Secret confirmation is already complete; do not ask G2 to resend it.

## Verification and rollback

1. After the approved deployment is READY, external GET `/api/webhook` returns the relay's 405 response rather than a login redirect.
   Confirm `/README.md`, `/package.json`, `/vercel.json`, `/test/webhook.test.mjs`, and `/api/webhook.mjs` do not return source or operational content (expect 404). The configuration/static-output checks are local evidence; these hosted checks still need the approved standalone deployment.
2. Unsigned POST returns 401, and malformed/expired/tampered signatures return 401 without forwarding.
3. FrameWorks Developer → Webhooks → Test sends the signed `webhook.test`; require a 2xx result. It is ignored by the staging event handler without a Supabase write.
4. Capture only SHA/deployment, HTTP statuses, endpoint/event/delivery IDs and timestamps. A local mock test is not deployed provider-delivery evidence.
5. Confirm a signed business event returns 503 without reaching staging while the relay is in its default probe mode. Only after a verified shared-database backup and separate approval, set the designated test stream ID and enable the flag, then redeploy the reviewed bounded revision and test only its live/idle transitions. Verify other streams and recording/upload/clip events remain blocked. This revision does not permit the broader test described in the historical proposal.

Rollback must be preapproved: disable only the new relay deployment or pause only this FrameWorks endpoint; keep the existing Livepeer webhook. Revoking the newly created crtv4 bypass credential or removing the relay's private variables is a separate access/secret change and must be covered by that rollback approval. Do not restore FrameWorks delivery to the production Livepeer route and call that a working rollback.

## References

- [Native Vercel Fetch-handler function](https://vercel.com/docs/functions)
- [FrameWorks endpoint interface and secret creation](https://github.com/Livepeer-FrameWorks/monorepo/blob/11c40d55ac8ede27df0ceb10d62048c0dd4010e9/website_docs/src/content/docs/builders/webhooks.mdx)
- [Vercel automated access and bypass credential handling](https://vercel.com/docs/deployment-protection/automated-agent-access)
- [Staging webhook test plan](../../docs/migration/frameworks-webhook-verification.md)
