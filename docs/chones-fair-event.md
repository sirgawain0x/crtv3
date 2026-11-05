# Chones FAIR BETA (static curated event)

**Status:** Shipped (deploy-time config). Self-serve brand events remain a [proposal](./brand-events-proposal.md).

FAIR BETA is the second Chones hub event alongside HACKATHON BETA. Unlike hack-beta (community submissions in Supabase), FAIR is a **read-only curated grid** driven by a static URL list in the repo.

## Routes and registry

| Piece | Location |
|-------|----------|
| Hub card | `lib/chones/events.ts` → `CHONES_EVENTS` (`slug: "fair"`, title **FAIR BETA**, href `/chones/fair`) |
| Event page | `app/chones/fair/page.tsx` → `FairPageClient` |
| Video grid | `components/chones/fair/FairVideoGrid.tsx` |

## Curating the lineup

1. Edit `CHONES_FAIR_VIDEO_REFERENCES` in `lib/chones/fair-videos.ts`.
2. Add one Creative TV link per video (discover URL preferred):

   ```ts
   export const CHONES_FAIR_VIDEO_REFERENCES: readonly string[] = [
     "https://tv.creativeplatform.xyz/discover/{livepeer-asset-uuid}",
   ];
   ```

   Also accepted: `/discover/{uuid}`, bare asset UUID, `/watch/{playbackId}`, or full watch URLs (see file header comments).

3. Deploy. The page uses `dynamic = "force-dynamic"` and loads rows at request time via `loadChonesFairVideos()`.

## Load rules

Implementation: `lib/chones/load-fair-videos.ts`.

- Invalid references are logged and skipped (page still renders).
- Missing rows → warn, skip.
- Only `published` or `minted` assets appear; draft/private rows are skipped.

## Operations checklist

- [ ] Every reference resolves to a **public** catalog video before an event goes live.
- [ ] Empty config shows an empty grid (valid for staging); populate before marketing push.
- [ ] For owner self-serve events + DB-backed video membership, follow [brand-events-proposal.md](./brand-events-proposal.md) instead of extending this static pattern.
