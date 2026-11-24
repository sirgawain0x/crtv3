# Channel cutover

TL;DR: prepare each reviewed offline channel once, verify the real provider policy and recording preference, then apply the guarded catalog transaction. Preparation does not change active channel credentials.

The private `frameworks_stream_replacements` ledger keeps both old and replacement ingest keys server-side. Anonymous and authenticated roles have no table access, and the runtime cannot delete reservations. The reviewed snapshot contains only the row ID, owner, original provider identities, live state, recording preference, payment gate, price and update timestamp.

The signed platform-admin operator at `/migration/frameworks/channels` accepts one exact offline snapshot. It is available only on the explicit QA/preview or production/production database pair. Reservations transition from prepared to creating before upstream creation; uncertain outcomes become ambiguous and cannot recreate automatically. Existing FrameWorks channels are verified in the current tenant instead of having their keys replaced. New targets use deterministic names, retain the recording preference and require the configured JWT signing key plus exact playback audience. Preparation reads back the provider configuration before reporting ready. Ingest keys and raw provider errors never appear in responses.

Apply the additive ledger schema to QA first and verify the real signed-admin preparation path. Before production preparation, apply the reviewed additive schema to production and capture a fresh complete channel snapshot. Five legacy channels require replacement keys; creators must retrieve the new keys from their existing Studio after cutover and update OBS. Do not send creator notifications without separate instructions.

Generate reviewable transaction artifacts:

```sh
npx tsx scripts/frameworks-stream-cutover.ts --snapshot /private/path/channels.json --output /private/path/new-cutover-directory
```

This command performs no database or provider requests and emits no ingest keys. Its apply transaction locks both tables, rejects an incomplete or changed channel catalog, and checks every source identity, owner, gate, recording preference, live state, update timestamp and old key against the reservation. Only ready targets can replace active identities. Existing row IDs and metadata remain stable; legacy watch aliases are retained. Repeated application verifies already-applied identities rather than changing them again.

Rollback verifies the replacement identities, keys and access settings before restoring original identities and keys from the private ledger. It preserves later metadata and advances the reservation's expected update timestamp to the restored row version. A subsequent cutover requires a freshly reviewed snapshot; the previous artifacts remain stale. Original reviewed snapshots remain in the private release artifacts. Treat rollback as recovery, not as permission to resume ongoing Livepeer service; the release target is FrameWorks only.

The production cutover remains blocked until the 45 archived sources, real upload/live/recording/clip flows, signed webhooks, access checks, fresh backup, VOD remap and channel preparation are verified. Never switch the provider merely because preparation tests pass.

Provider read-back fields were checked against the [pinned FrameWorks GraphQL schema](https://github.com/Livepeer-FrameWorks/monorepo/blob/11c40d55ac8ede27df0ceb10d62048c0dd4010e9/pkg/graphql/schema.graphql): Stream exposes record, playbackPolicy, playbackId and the publisher-only streamKey.
