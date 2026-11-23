# FrameWorks release checkpoint

TL;DR: x402 payment replay is complete in production. FrameWorks remains in preparation; do not switch the production provider until the data, access, and live verification gates below pass.

The release integration combines main d25573da5 with staging 9a67c151b. Production payment verification, no-store responses and prediction correctness fixes are retained. The initial combined tree passed 1,141 tests and TypeScript. Follow-up fixes accept bounded opaque provider asset IDs, use canonical VOD artifact hashes instead of GraphQL node IDs on import/completion, route the shared playback-info handler through the selected provider, and pass existing stored subtitles into the player.

## Required before cutover

- DNS setup is complete: staging.tv.creativeplatform.xyz CNAME and a separate verification TXT were added under the prior exact approval. Authoritative DNS returns both, the existing invest verification TXT remains present, and Vercel reports verified=true with gitBranch=staging. HTTPS, access protection, sign-in/session and wallet signing still need live verification.
- Verify one non-recording stream in the isolated QA database, browser and OBS ingest, live/idle delivery, recording preference and playback.
- Verify multipart upload, completion, playback, clips and recordings against the real provider. Local tests are not hosted E2E evidence.
- Provider-specific signing is wired locally into the shared sign-jwt HTTP handler. Seven regression cases cover real ES256 playback-scoped tokens, retained wallet/MeToken checks, unknown/draft VOD denial, storage failure and Livepeer compatibility. Verify on the hosted staging build.
- New multipart uploads now require provider-confirmed JWT policy before upload parts are released. Publishing requires verified creator proof, ready media and an atomic server-only access update; signing reads that authority rather than legacy video metadata. Verify these paths on hosted staging, including creator draft preview. Clips, recordings and imported assets still need reviewed access-record seeding/inheritance before cutover.
- Durable business-event receipts now commit with database effects in a server-only transaction; source timestamps prevent stale stream state, and upload/clip ready observations survive delayed browser persistence. Rolled-back hosted QA checks pass. Real signed provider delivery and complete upload/clip/recording playback flows still require staging verification.
- Locate the latest source archive/checksum manifest, reconcile new Studio uploads, and verify source coverage before importing. Existing PR #426 inventory/archive tooling is integrated into this candidate; its 29 tests pass. A fresh read-only inventory found 51 Studio assets (six missing/failed), 36 DB-linked assets, 15 Studio-only assets and 16 DB-only rows; known source bytes total 5,723,426,515. Archive coverage is now reconciled for all 45 ready sources, with no missing IDs or size mismatches; see the verification limits below.
- Complete resumable import/ID mapping, additive provider/legacy ID schema, reference remap dry run and conditional rollback. Legacy discover/prediction and VOD playback aliases are wired and tested; preserve old IDs in the reviewed remap, with no blanket rewrite. Stream alias handling remains part of the separate creator-stream cutover.
- Take/verify a fresh backup before production data changes, review exact affected rows and exceptions, then apply the approved plan.
- Reuse existing FrameWorks credentials; production credential provisioning and provider switch follow reviewed readiness. Do not rotate endpoint secrets or recreate creator streams implicitly.

Production rollback target before this migration: dpl_6muM1Gv2U3HDfygVpc4MUTSfuLof. The existing Livepeer provider stays selected during preparation. Preserve the completed x402 receipt ledger and gas-off settings during any rollback.

## Archive and clip identity follow-up

MEGA access is configured. The approved additive upload is complete: the previously missing source and a separate delta manifest were added without replacing the original manifest or CSV. The cloud archive now contains 45 source videos totaling 5,723,426,515 bytes, matching every ready asset in the post-upload Studio inventory. All entries have recorded SHA-256 values. The original 44 files were checked by cloud filename/size against their manifest, not freshly downloaded and rehashed. The new source was freshly SHA-256 hashed before upload. Six failed/incomplete Studio entries and 16 DB-only historical drafts remain explicitly outside ready-source coverage. No source import or production remap has occurred.

Clip creation and lookup now use the canonical clipHash instead of GraphQL node IDs. Missing clipHash fails closed before a result can be persisted. The expanded application suite passes 1,193 tests across 220 files; provider identity tests and TypeScript pass. Integration head 2adfe9bcf passed hosted Vercel/GitHub checks. Subsequent identity migration preparation requires fresh hosted checks after push.


## Additive identity migration preparation

Local migration `20261123051536_frameworks_asset_identity.sql` adds separate provider, Livepeer and FrameWorks identity columns without changing active IDs or guessing existing providers. A server-only import ledger reserves each source once and retains ambiguous outcomes; runtime deletion is denied. The identity migration is applied and permission-checked in the isolated QA database only; production is unchanged.

The pure remap planner accepts only ready mappings whose source IDs, playback IDs, sizes and checksums match the archive. It keeps stable video row IDs and prepares guarded updates for parent playback links, hack submissions, shopping references and transaction playback links. Unmapped published videos and unresolved historical references block executable SQL. Application and rollback run in a transaction with identity checks; rollback changes identity fields only and preserves newer metadata. Already migrated references are recognized on a resumed dry run. This is preparation tooling, not a completed import or an authorization to apply production SQL.


## Protected uploads and resumable importer

The isolated QA database now has the additive identity migration, server-only VOD access registry and publication-policy lock. Anonymous/authenticated users cannot read or update either ledger or execute the publication function; runtime deletion is denied; anonymous stream-key SELECT remains denied. Security advisors report only informational RLS-without-policy findings for these intentionally server-only tables and one existing backup table. No import or VOD access rows have been created by this preparation.

All new multipart VOD uploads establish an exact JWT signing-key/playback-audience policy before part URLs leave the server. Direct URL imports are disabled because they begin transferring media before that policy can be confirmed. The upload action registers the verified creator in a separate playback-authority table. Publishing verifies wallet ownership, provider readiness and policy confirmation, then changes access rules and corresponding video fields together in a server-only transaction. Legacy metadata writes cannot authorize VOD playback. Draft preview tokens require the registered creator's proof. After initial publication the gate is immutable on that playback ID, preventing older public tokens from bypassing a new gate; a changed gate requires a new protected upload. Archiving prevents new tokens; existing tokens retain their original expiry.

The multipart importer reserves each archived source atomically before a provider mutation, persists target IDs before transferring bytes, checks both the local source hash and the bytes actually uploaded, and checks readiness/duration/protection before marking a mapping ready. An uncertain creation/upload/completion stops as ambiguous and requires reconciliation; polling never recreates the source. Source URLs, part URLs, credentials and raw provider errors are excluded from the import ledger. No production import executor is enabled.

`npm run frameworks:vod-import -- --manifest /private/path/manifest.json --manifest /private/path/delta.json` is a read-only dry run. Add `--source SOURCE_UUID --file /private/path/source.mp4` to verify one file's full checksum locally. The 63,405,447-byte delta source passed this real dry run with zero provider requests/database writes. `--execute` is restricted to one source and the exact isolated QA project, using explicitly provided server credentials; `--poll --execute` only checks an existing reservation. Reuse existing server secrets through the reviewed staging execution path; do not export Vercel private keys or substitute production credentials.

The full application suite passed 1,235 tests across 227 files after access enforcement; an additional local-file checksum/read test passed separately. TypeScript passes. The previous hosted failure was a column-grant test catching newly added stream identity fields; explicit grants now expose only those public identity fields, preserving stream-key restrictions, and the migration tests pass.


## Durable webhooks and legacy links

Business events no longer use an instance-local dedupe map. A server-only transaction stores an event ID plus payload digest with its stream/recording/readiness effects. Reused IDs with conflicting payloads fail, failed effects roll back their receipt, different ready events for the same artifact serialize, and older/equal-time stream state events cannot overwrite newer state. Recording ownership and gate metadata come from the stored parent stream; payload-supplied owners are ignored. Recording-disabled streams are honored. Upload/clip ready events store a durable observation without inventing an owner or publishing a draft. The signer still requires a separate reviewed VOD access record, so a recording metadata row alone does not grant playback.

The durable migration and a hosted-schema thumbnail fix are applied to isolated QA. A real rolled-back QA transaction verified duplicate delivery, stale-event rejection and exactly one recording with its inherited gate. It initially exposed the hosted NOT NULL thumbnail constraint; the follow-up now uses an empty thumbnail fallback and the local schema test enforces the same constraint. The successful repeat reported all fixtures clean after rollback. No provider stream was created or broadcast.

Discover and prediction resolution accepts canonical opaque IDs and preserved legacy IDs while retaining the stable video row PK. UUIDs normalize to lowercase; opaque IDs retain case; filter-injection characters are rejected. Old VOD playback links resolve only through ready import mappings, then use the canonical playback URL and JWT audience. Storage failures/ambiguous aliases fail closed. Production Livepeer paths do not reference the additive alias columns.

The expanded full suite passes 1,258 tests across 231 files, and TypeScript passes. The earlier access/import checkpoint passed hosted checks. The latest webhook/alias checkpoint needs fresh hosted checks after push. Remaining release gates include protected playback authority for imported assets, clips and recordings; real staging sign-in/wallet/stream/upload/playback verification; the actual source imports and reviewed remap/backup; and the final production cutover.


## Reviewed access seeding in the cutover plan

A separate cutover planner now combines the identity remap and authoritative VOD access seeding in one transaction. It preserves the source snapshot's creator, publication status, MeToken requirement and exact numeric price. Missing/invalid ownership or payment evidence blocks SQL generation. An owner/gate change after the snapshot or a conflicting existing access record rolls back the entire remap rather than relaxing playback. Apply/reapply/rollback execution tests pass, and rollback retains new access records and import reservations while preserving newer metadata.

`npm run frameworks:vod-remap -- --snapshot /private/path/snapshot.json --mappings /private/path/ready-mappings.json --manifest /private/path/manifest.json --manifest /private/path/delta.json` produces a count-only dry-run summary. It makes no database requests or writes. `--output NEW_PRIVATE_DIRECTORY` writes a private review plan and emits apply/rollback SQL only when every coverage/reference/creator/payment gate passes. G2 explicitly approved the metadata-only export. The production snapshot was saved privately (mode 0600) on 2026-11-23 at 15:04 UTC, with 52 videos and 33 linked reference rows. No source URL, key or video content is included. The first dry run has zero ready imports, 28 published-coverage blockers and no executable SQL.

The complete access-seeding checkpoint passes 1,262 tests across 232 files and TypeScript. No source import, production schema apply or production ID remap has occurred.


## Staging deployment and source reconciliation (2026-11-23)

PR #463 is merged into staging at fd6334191d791fd8a5152831011d7006d91a60b0. Vercel deployment dpl_8XDEVV1kuVDQ9qYziqQVj2TtBhey is READY, and staging.tv.creativeplatform.xyz resolves to it. The browser loaded assets bearing that deployment ID and restored the existing platform-admin creator session. Wallet signing, source transfer and complete playback have not yet been proven on this release. The automated browser file helper requires broader local-file access; no extension permission was changed and no test file was transferred through it.

The approved snapshot has 28 published videos with archived sources, eight archived drafts and 16 old drafts with no source. Twenty-one transaction references point to seven retired playback IDs absent from the archive, active video snapshot and current streams (checked read-only). Explicit row/field/value preservation exceptions retain these historical payments unchanged. Known archive/video IDs cannot be exempted from mapping; snapshot drift in a preserved reference blocks the transaction. The reviewed dry run therefore retains 21 historical references while 19 covered reference fields and the 28 published videos still await real import mappings. No IDs or payment records have been changed.

A read-only Studio policy audit checked all 45 archived source IDs/playback IDs/readiness states: 45 public/default policies, zero legacy JWT/webhook/unknown policies and zero request or identity errors. The source importer rechecks this per transfer and rejects unreviewed legacy gates.

The follow-up operator action is restricted to Preview + the exact isolated QA project + FrameWorks + a signed platform-admin wallet. It fetches only the original from the approved Studio CDN, checks bounded HTTP ranges and the full archive checksum before provider creation, then checks transferred bytes again before completion. It uses existing server credentials without exporting keys or source URLs to the browser/Mac. Polling fetches no source bytes, and uncertain outcomes retain their reservation. The action cannot run in production. Its hosted transfer and signing verification remain pending deployment of the follow-up.
