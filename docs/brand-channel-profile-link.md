# Brand channel profile links

Brand Pass holders can attach a brand channel to their creator profile via
**Profile → MeTokens → Creator Profile → Brand channel** (or the public
`/creator/[address]` page shows a **Channel** button for visitors).

## Storage

- Column: `creator_profiles.brand_channel_slug` (nullable text)
- Valid slugs: `chones`, `spindrift`, `songchain` (see `lib/channels/brand-channels.ts`)
- Writes require wallet auth + active Brand Pass (`app/api/creator-profiles/upsert/route.ts`)

## Channel routes (unchanged)

| Brand     | Root route   | Config                         | Events registry              |
|-----------|--------------|--------------------------------|------------------------------|
| Chones    | `/chones`    | `lib/chones/config.ts`         | `lib/chones/events.ts`       |
| Spindrift | `/spindrift` | `lib/spindrift/config.ts`      | `lib/spindrift/events.ts`    |
| Songchain | `/songchain` | `lib/songchain/config.ts`      | `lib/songchain/events.ts`    |

Event sub-routes (e.g. `/chones/hack-beta`, `/spindrift/mixer-culture`,
`/songchain/song-cup`) are defined in each `events.ts` file and are not stored
on the profile — the profile link points to the channel root.

## Attaching a channel later (Spindrift / Songchain)

1. Ensure the wallet holds a Brand Pass (Unlock locks in `lib/sdk/unlock/services.ts`).
2. Open **Profile** (`/profile/[your-address]`) → **MeTokens** tab → **Creator Profile**.
3. In **Brand channel**, pick **Spindrift** or **Songchain** and save.
4. Visitors on `/creator/[your-address]` will see a **Channel** button → `/spindrift` or `/songchain`.

No admin mapping or deploy is required; the slug is persisted on `creator_profiles`.

## Chones (wired in this feature)

- Owner: `0x6aBAa01C84b8b962D197E8a62598fea3Cfe0c5AD` (Hack Beta admin in `lib/chones/hack-beta/admin-config.ts`)
- Migration seeds `brand_channel_slug = 'chones'` for that wallet when a profile row exists.
