# Livepeer Studio → FrameWorks VOD migration

Studio shuts down **2026-11-30**. Parent issue: [#401](https://github.com/sirgawain0x/crtv3/issues/401).

Per [#407](https://github.com/sirgawain0x/crtv3/issues/407) (G2 plan, Nov 10 comment):

| Step | Scope |
|------|--------|
| **PR1 (this)** | **Inventory + archive script** (read-only toward Studio). List every Studio asset; cross-reference `video_assets`; download sources to archive with checksum manifest ( `--archive` only, after G2 OK). |
| **PR2** | **Import script** — `importVodAsset` from Studio `downloadUrl`; resumable/idempotent; write **id-map** (Studio asset/playback → FrameWorks IDs). |
| **PR3** | **Remap** — dry-run script showing DB/embed changes from id-map + rollback file; prod apply needs G2 OK. (Additive schema/IDs may land with PR2/PR3 as needed — separate from this PR.) |

G2: custom import; **new** FrameWorks IDs; archive all sources first; no caption migration at cutover ([#408](https://github.com/sirgawain0x/crtv3/issues/408)).

## Studio list API

Inventory uses `GET /api/asset` with `limit`, `cursor`, `order`, and `count=true` per [Get All Assets](https://docs.livepeer.org/v2/solutions/livepeer-studio/api-reference/assets/get-all) and the [Studio asset controller](https://github.com/livepeer/studio/blob/master/packages/api/src/controllers/asset.ts). Next page: `Link: <...?cursor=...>; rel="next"`.

## PR1 — inventory (default)

```bash
yarn livepeer:studio-vod-inventory --json ./livepeer-studio-inventory.json --csv ./livepeer-studio-inventory.csv
```

Outputs separate `studioRows`, `studioOnlyOrphans`, and `dbOnlyOrphans` in JSON; CSV contains Studio rows only.

## PR1 — archive (explicit)

```bash
npx tsx scripts/livepeer-studio-vod-inventory.ts --archive /path/to/destination
```

Uses `GET /api/asset/{id}` → `downloadUrl` ([Retrieve an asset](https://docs.livepeer.org/v2/solutions/livepeer-studio/api-reference/assets/get)), streams to disk with SHA-256 manifest. **G2 approval before production bulk download.**

**Checksum mismatch policy (quarantine):** If an on-disk file or a re-download does not match the manifest’s expected SHA-256, the bytes are moved under `quarantine/` inside the archive root (canonical path cleared), the manifest entry records `failed` with expected vs observed hash/size, and the run exits non-zero. The next resume re-downloads into the canonical path; a matching download clears `failed` and updates the manifest.

### Archive destination options (cost rough order)

1. **Local disk** — $0; samples only.
2. **S3 / R2 / B2** — ~$0.006–0.023/GB-mo + egress.
3. **Supabase Storage / Vercel Blob** — convenience; confirm spend with G2.
