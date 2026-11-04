# Brand-created channel events (proposal)

**Status:** Proposal only — no migration applied in this PR.  
**Example:** Chones channel (`/chones`) shows HACKATHON BETA today; brand owner needs a second event **FAIR** with a curated set of existing library videos.

## Investigation summary

### How HACKATHON BETA is modeled and rendered

| Concern | Implementation |
|--------|----------------|
| Event list on channel hub | Hardcoded array `CHONES_EVENTS` in `lib/chones/events.ts` |
| Hub UI | `components/chones/ChonesPageClient.tsx` maps `CHONES_EVENTS` into an Events grid (Trophy heading, cards, links) |
| Event detail route | `app/chones/hack-beta/page.tsx` → `components/chones/hack-beta/HackBetaPageClient.tsx` |
| Gallery videos | **Not** from the static registry — approved rows in `public.hack_beta_submissions` (community submit + admin approve) |
| Event metadata in DB | **None** — no `brand_events` table; only submission/settings tables from `lib/sdk/supabase/migrations/00006_hack_beta_submissions.sql` |

Spindrift and Songchain follow the same split: static `lib/{brand}/events.ts` + brand-specific submission tables for interactive events (e.g. Song Cup).

Profile `brand_channel_slug` links a creator to a channel **root** only; event sub-routes are not stored on the profile (`docs/brand-channel-profile-link.md`).

### Brand channel “ownership” today

| Check | Where | Behavior |
|-------|--------|----------|
| Brand Pass | `lib/channels/brand-channel-access.ts` → `addressHasBrandPass` | Required to **set** `brand_channel_slug` on upsert |
| Slug validation | `lib/channels/brand-channels.ts` | `chones` \| `spindrift` \| `songchain` |
| Profile write | `app/api/creator-profiles/upsert/route.ts` | Brand Pass + valid slug; **no** exclusive “this wallet owns Chones” enforcement |
| Documented Chones owner | `CHONES_CHANNEL_OWNER_ADDRESS` in `lib/channels/brand-channels.ts` | Constant for tests/docs; **not** used in API guards |
| Hack Beta admin | `lib/chones/hack-beta/admin-config.ts` | Separate wallet allowlist for submission review, not channel ownership |
| Channel pages | Public — no middleware owner gate (`components/auth/MembershipGuard.tsx` excludes `/chones`, etc.) |

**Gap for self-serve “New event”:** we need a server-side rule: authenticated wallet is the **sole linked owner** of `brand_channel_slug = 'chones'` (or chosen brand). That rule does not exist for mutations today.

### Brand video library / delete

| Piece | Path |
|-------|------|
| Uploads History tab | `components/UserProfile/UserProfile.tsx` → **Uploads** |
| Grid | `components/UserProfile/list-uploaded-assets/ListUploadedAssets.tsx` |
| Delete | `components/UserProfile/list-uploaded-assets/UploadHistoryCard.tsx` → `deleteVideoAsset()` in `services/video-assets.ts` (creator_id match on `video_assets`) |

There is no separate brand-channel library; owners manage **their own** uploads on profile. Event video picker should list the owner’s published assets (same source as upload history).

---

## Decision: schema and auth changes are required

A brand owner creating an event **at runtime** (name + channel + video IDs) cannot be stored or authorized without:

1. **Schema** — persist event metadata and video membership (not in `CHONES_EVENTS` or hack_beta submission shape).
2. **Auth / access gating** — enforce exclusive brand-channel owner on create/update/delete APIs (403 for non-owner).

**Out of scope for zero-migration workaround:** deploy-time edits to `lib/chones/events.ts` + a static TS config of video IDs could render FAIR without DB changes, but that is not the requested self-serve dashboard flow and still would not add owner-only API guards.

---

## Proposed schema (migration SQL)

Apply as a new Supabase migration (filename example: `supabase/migrations/YYYYMMDDHHMMSS_brand_channel_events.sql`). Mirror under `lib/sdk/supabase/migrations/` per repo convention.

```sql
-- Brand channel events: metadata + curated video lists (owner-managed)

CREATE TABLE IF NOT EXISTS public.brand_channel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_channel_slug TEXT NOT NULL
        CHECK (brand_channel_slug IN ('chones', 'spindrift', 'songchain')),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'upcoming')),
    -- Display order on channel hub (lower first)
    sort_order INT NOT NULL DEFAULT 0,
    created_by_wallet TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    UNIQUE (brand_channel_slug, slug)
);

CREATE INDEX IF NOT EXISTS idx_brand_channel_events_slug
    ON public.brand_channel_events (brand_channel_slug, status);

CREATE TRIGGER trg_brand_channel_events_updated_at
    BEFORE UPDATE ON public.brand_channel_events
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.brand_channel_event_videos (
    event_id UUID NOT NULL REFERENCES public.brand_channel_events(id) ON DELETE CASCADE,
    video_asset_id TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (event_id, video_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_channel_event_videos_asset
    ON public.brand_channel_event_videos (video_asset_id);

-- Optional: one profile row per brand slug (enforces single owner at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_profiles_brand_channel_slug_unique
    ON public.creator_profiles (brand_channel_slug)
    WHERE brand_channel_slug IS NOT NULL;

ALTER TABLE public.brand_channel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_channel_event_videos ENABLE ROW LEVEL SECURITY;

-- Public read for active/upcoming events (channel pages are public)
CREATE POLICY brand_channel_events_select_public
    ON public.brand_channel_events FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY brand_channel_event_videos_select_public
    ON public.brand_channel_event_videos FOR SELECT
    TO anon, authenticated
    USING (true);

-- Writes via service role only (Next.js API routes enforce owner)
CREATE POLICY brand_channel_events_service_all
    ON public.brand_channel_events FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY brand_channel_event_videos_service_all
    ON public.brand_channel_event_videos FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);
```

**Notes:**

- `slug` is URL segment: `/chones/fair` for title FAIR → slug `fair`.
- `video_asset_id` matches `video_assets.asset_id` (text), consistent with `hack_beta_submissions.video_asset_id`.
- Unique index on `creator_profiles.brand_channel_slug` aligns runtime ownership with “one channel, one linked profile”; resolve conflicts before enabling in production if multiple rows already share a slug.

---

## Ownership check (server)

Add `lib/channels/assert-brand-channel-owner.ts`:

```ts
export async function getBrandChannelOwnerAddress(
  slug: BrandChannelSlug
): Promise<string | null> {
  // SELECT owner_address FROM creator_profiles
  // WHERE LOWER(brand_channel_slug) = slug LIMIT 1
}

export async function assertBrandChannelOwner(
  walletAddress: string,
  slug: BrandChannelSlug
): Promise<void> {
  const owner = await getBrandChannelOwnerAddress(slug);
  if (!owner || owner.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new BrandChannelForbiddenError(); // maps to HTTP 403
  }
}
```

**API routes** (all use existing wallet session verification pattern from `app/api/creator-profiles/upsert/route.ts` — no Privy/env changes):

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/brand-channel-events?brand=chones` | Public — list events for hub merge |
| `GET` | `/api/brand-channel-events/[brand]/[eventSlug]` | Public — event + resolved videos |
| `POST` | `/api/brand-channel-events` | Owner + Brand Pass; body: `{ brand_channel_slug, title, slug?, description?, video_asset_ids[] }` |
| `PATCH` | `/api/brand-channel-events/[id]` | Owner — update metadata / replace video list |
| `DELETE` | `/api/brand-channel-events/[id]` | Owner |

**Validation on create/update:**

- `assertBrandChannelOwner(sessionWallet, brand_channel_slug)`.
- Each `video_asset_id` must exist in `video_assets` with `creator_id = sessionWallet` (same rule as delete in `services/video-assets.ts`).
- Slug: `[a-z0-9-]+`, unique per `(brand_channel_slug, slug)`.

**Tests:**

- Owner wallet linked to `chones` → `POST` 201, event appears in `GET` list.
- Random wallet → `POST` 403.
- Event page renders chosen videos (integration or API + component test).

---

## UI plan

### 1. Uploads History — “New event” (brand owners only)

**File:** `components/UserProfile/list-uploaded-assets/ListUploadedAssets.tsx` (header row next to existing controls).

**Visibility:** Client loads current user’s `creator_profiles.brand_channel_slug`; show button only when slug is non-null **and** `useUser().address` matches server-confirmed owner (optional lightweight `GET /api/brand-channel-events/ownership` to avoid exposing other owners’ addresses).

**Flow (modal or dedicated route `/profile/.../events/new`):**

1. Event name (e.g. FAIR) → derive default slug `fair`.
2. Confirm brand channel (read-only from profile).
3. Multi-select from same published list as upload history (`fetchPublishedVideos` / `GET /api/video-assets/published?creatorId=...`).
4. Submit → `POST /api/brand-channel-events`.

Do **not** change per-video upload pipeline.

### 2. Channel hub — merge static + DB events

**File:** `components/chones/ChonesPageClient.tsx` (and Spindrift/Songchain counterparts later).

- Server component wrapper or RSC fetch: load DB events for `chones`.
- Merge with `CHONES_EVENTS` for display (keep HACKATHON BETA static until migrated, or backfill one row and remove static entry in a follow-up).
- Reuse existing card markup / `Trophy` Events section; generic title when no custom SVG (today only `hack-beta` has outlined SVG).

### 3. Event detail page — reuse gallery patterns

**New route:** `app/chones/[eventSlug]/page.tsx` (dynamic), or explicit routes per event if preferred for SEO.

- For `hack-beta`, keep existing dedicated page.
- For owner-created events (`fair`), render a slimmer variant of `HackBetaGallery` fed by `brand_channel_event_videos` + published asset metadata (new `BrandChannelEventPageClient` sharing grid/video card components from hack-beta or `components/videos/*`).

---

## Rollout / migration of HACKATHON BETA (optional follow-up)

1. Insert row into `brand_channel_events` for hack-beta metadata.
2. Backfill `brand_channel_event_videos` from approved `hack_beta_submissions` **or** keep hack-beta on submission flow and only use new tables for curated (non-submit) events like FAIR.

---

## Explicit non-goals (per product constraints)

- No Privy, Vercel, or env changes in the implementation PR.
- Do not apply migrations from agent/cloud CI — human review + Supabase deploy.
- Do not change Hack Beta submit/review flows unless explicitly migrating that event.

---

## Acceptance criteria (implementation PR after this proposal merges)

- [ ] Owner sees **New event** on Uploads History; non-owner does not (UI) and receives 403 on API.
- [ ] FAIR (or equivalent) appears on `/chones` Events grid like HACKATHON BETA.
- [ ] Event detail shows only selected library videos.
- [ ] Lint, typecheck, unit/integration tests green in CI.
