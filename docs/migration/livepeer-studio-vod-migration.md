# Livepeer Studio → FrameWorks VOD migration

Studio shuts down **2026-11-30**. Parent issue: [#401](https://github.com/sirgawain0x/crtv3/issues/401).

| PR | Scope |
|----|--------|
| **PR1 (this)** | Inventory + archive tooling (`scripts/livepeer-studio-vod-inventory.ts`). New FrameWorks IDs and DB remap are **not** in this PR. |
| **PR2** | Additive Supabase schema (`provider`, FrameWorks IDs alongside Livepeer IDs per [#407](https://github.com/sirgawain0x/crtv3/issues/407)). |
| **PR3** | Import/re-upload from archive → FrameWorks; remap `video_assets` and related tables; idempotent dry-run then cutover. |

G2 decisions: custom import script; **new** FrameWorks asset IDs with link/DB updates in PR2/PR3; **archive all sources before cutover**; **no new captions at cutover** ([#408](https://github.com/sirgawain0x/crtv3/issues/408) option 1+3).

## PR1 — inventory (default)

Read-only. Requires `LIVEPEER_API_KEY` or `LIVEPEER_FULL_API_KEY`. Optional Supabase service role for `video_assets` cross-reference.

```bash
yarn livepeer:studio-vod-inventory --json ./livepeer-studio-inventory.json --csv ./livepeer-studio-inventory.csv
```

Outputs asset id, playback id, name, status, size, duration, source/download availability, DB linkage, and orphans.

## PR1 — archive (explicit)

```bash
npx tsx scripts/livepeer-studio-vod-inventory.ts --archive /path/to/destination
```

Resumable, SHA-256 manifest, skips completed files. Storage is pluggable via `ArchiveStorageBackend` (local filesystem implementation included). **Requires G2 approval before production bulk download.**

### Archive destination options (cost rough order)

1. **Local disk / engineer workstation** — $0; fine for dry-run samples; not durable for prod handoff.
2. **Cloud object storage** (e.g. S3 ~$0.023/GB-mo, R2 ~$0.015/GB-mo, Backblaze B2 ~$0.006/GB-mo) — recommended for prod archive; egress fees apply on restore.
3. **Supabase Storage / Vercel Blob** — convenient if already on platform; per-GB pricing similar to object storage; confirm egress and retention with G2 before spend.
