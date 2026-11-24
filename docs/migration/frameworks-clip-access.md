# Protected clip release checks

FrameWorks clip creation requires a verified wallet and checks the source broadcaster's MeToken gate before allocating a clip. The provider clip must confirm the configured JWT key and exact playback audience before the app registers ownership.

`register_frameworks_clip` writes private playback authority and draft catalog metadata in one transaction. It checks that the stored source identity, gate and clipping permission still match the authorized request. Story parent metadata comes from the stored channel. Duplicate or conflicting rows roll back; client metadata cannot claim ownership.

The clip owner can preview a draft. Published clips retain the broadcaster as their gate issuer, independently of the clip owner's identity. Derived gate settings are immutable even while the clip is a draft. Publishing requires a ready provider clip and another confirmation of its JWT protection.

Apply `20261124182629_frameworks_clip_authority.sql` before deploying the clip handler. Production cutover still requires a real signed creator flow: synthetic ingest, clip creation, owner preview, gated viewer rejection, and publish/replay. Unit and local Postgres checks do not replace this staging verification.

Clip handlers emit `creative.clips.requests` and `creative.clips.duration_ms`, with bounded operation and outcome attributes. They do not record wallet addresses, media URLs or credentials.
