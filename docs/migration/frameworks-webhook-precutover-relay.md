# FrameWorks webhook delivery before cutover

TL;DR: the existing production webhook URL can forward authenticated FrameWorks events to isolated staging for real delivery tests. This does not switch the production video provider or write production records.

The path runs only on a Vercel Production deployment while VIDEO_PROVIDER is not frameworks. It recognizes Standard Webhooks headers, bounds the body, verifies the existing FrameWorks HMAC and timestamp, and forwards only the subscribed event types to the fixed staging webhook URL. Original signed bytes and headers are preserved. An existing VERCEL_AUTOMATION_BYPASS_SECRET is sent only as a server-side header to that same project's staging endpoint. It is never returned, logged, placed in a URL, or given to FrameWorks. The staging handler independently verifies the original signature and applies QA-only persistence.

The user approved the existing FrameWorks webhook secret for Production and named staging. No new endpoint, secret rotation, protection exception, cloud project or source credential export is required. If the existing automation bypass is unavailable, delivery fails closed with 503; provisioning a new credential is a separate action, not an implicit part of this code.

Before the full migration, use the existing FrameWorks endpoint's Test action and require a successful response from the protected staging handler. Verify actual stream/upload events in the QA database. Failures are retryable and never acknowledged as successful delivery. Unknown signed event types are ignored without production side effects. Legacy deliveries retain their existing handler until the provider switch.

During final integration, retain the full FrameWorks production handler from staging. VIDEO_PROVIDER=frameworks disables this temporary relay; normal events then persist to production through that handler. Do not leave the relay as the only FrameWorks handler at cutover. Rollback of this readiness change is a code revert; it performs no schema/data changes.

Local verification covers valid signed forwarding, tampered/stale/future rejection, private failure responses, missing bypass, inactive environments, existing legacy handling, and the absence of production provider/database calls for FrameWorks events.
