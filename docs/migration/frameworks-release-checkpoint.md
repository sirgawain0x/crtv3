# FrameWorks release checkpoint

TL;DR: x402 payment replay is complete in production. FrameWorks remains in preparation; do not switch the production provider until the data, access, and live verification gates below pass.

The release integration combines main d25573da5 with staging 9a67c151b. Production payment verification, no-store responses and prediction correctness fixes are retained. The initial combined tree passed 1,141 tests and TypeScript. Follow-up fixes accept bounded opaque provider asset IDs, use canonical VOD artifact hashes instead of GraphQL node IDs on import/completion, route the shared playback-info handler through the selected provider, and pass existing stored subtitles into the player.

## Required before cutover

- DNS setup is complete: staging.tv.creativeplatform.xyz CNAME and a separate verification TXT were added under the prior exact approval. Authoritative DNS returns both, the existing invest verification TXT remains present, and Vercel reports verified=true with gitBranch=staging. HTTPS, access protection, sign-in/session and wallet signing still need live verification.
- Verify one non-recording stream in the isolated QA database, browser and OBS ingest, live/idle delivery, recording preference and playback.
- Verify multipart upload, completion, playback, clips and recordings against the real provider. Local tests are not hosted E2E evidence.
- Provider-specific signing is wired locally into the shared sign-jwt HTTP handler. Seven regression cases cover real ES256 playback-scoped tokens, retained wallet/MeToken checks, unknown/draft VOD denial, storage failure and Livepeer compatibility. Verify on the hosted staging build.
- Confirm that token-gated VOD applies an upstream access policy; FrameWorks upload input currently ignores the legacy playbackPolicy object. Do not publish protected media with a public provider policy.
- Replace instance-local webhook deduplication with reviewed durable processing or obtain explicit acceptance of the limitation. Prove upload/clip persistence through their full flows.
- Locate the latest source archive/checksum manifest, reconcile new Studio uploads, and verify source coverage before importing. Existing PR #426 inventory/archive tooling is integrated into this candidate; its 29 tests pass. A fresh read-only inventory found 51 Studio assets (six missing/failed), 36 DB-linked assets, 15 Studio-only assets and 16 DB-only rows; known source bytes total 5,723,426,515. Archive coverage is now reconciled for all 45 ready sources, with no missing IDs or size mismatches; see the verification limits below.
- Complete resumable import/ID mapping, additive provider/legacy ID schema, reference remap dry run and conditional rollback. Preserve existing discover/embed URLs and old IDs; no blanket ID rewrite.
- Take/verify a fresh backup before production data changes, review exact affected rows and exceptions, then apply the approved plan.
- Reuse existing FrameWorks credentials; production credential provisioning and provider switch follow reviewed readiness. Do not rotate endpoint secrets or recreate creator streams implicitly.

Production rollback target before this migration: dpl_6muM1Gv2U3HDfygVpc4MUTSfuLof. The existing Livepeer provider stays selected during preparation. Preserve the completed x402 receipt ledger and gas-off settings during any rollback.

## Archive and clip identity follow-up

MEGA access is configured. The approved additive upload is complete: the previously missing source and a separate delta manifest were added without replacing the original manifest or CSV. The cloud archive now contains 45 source videos totaling 5,723,426,515 bytes, matching every ready asset in the post-upload Studio inventory. All entries have recorded SHA-256 values. The original 44 files were checked by cloud filename/size against their manifest, not freshly downloaded and rehashed. The new source was freshly SHA-256 hashed before upload. Six failed/incomplete Studio entries and 16 DB-only historical drafts remain explicitly outside ready-source coverage. No source import or production remap has occurred.

Clip creation and lookup now use the canonical clipHash instead of GraphQL node IDs. Missing clipHash fails closed before a result can be persisted. The expanded application suite passes 1,193 tests across 220 files; provider identity tests and TypeScript pass. Integration head 2adfe9bcf passed hosted Vercel/GitHub checks. Subsequent identity migration preparation requires fresh hosted checks after push.


## Additive identity migration preparation

Local migration `20261123051536_frameworks_asset_identity.sql` adds separate provider, Livepeer and FrameWorks identity columns without changing active IDs or guessing existing providers. A server-only import ledger reserves each source once and retains ambiguous outcomes; runtime deletion is denied. This migration has not been applied to staging or production.

The pure remap planner accepts only ready mappings whose source IDs, playback IDs, sizes and checksums match the archive. It keeps stable video row IDs and prepares guarded updates for parent playback links, hack submissions, shopping references and transaction playback links. Unmapped published videos and unresolved historical references block executable SQL. Application and rollback run in a transaction with identity checks; rollback changes identity fields only and preserves newer metadata. Already migrated references are recognized on a resumed dry run. This is preparation tooling, not a completed import or an authorization to apply production SQL.
