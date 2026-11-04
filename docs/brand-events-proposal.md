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
3. **Single-channel ownership (required prerequisite)** — a **mandatory** partial unique index on `creator_profiles.brand_channel_slug` so each brand slug maps to at most one profile row. Owner lookup and `assertBrandChannelOwner` **depend on this invariant**; without the index, `LIMIT 1` owner queries are ambiguous and must not ship.

**Out of scope for zero-migration workaround:** deploy-time edits to `lib/chones/events.ts` + a static TS config of video IDs could render FAIR without DB changes, but that is not the requested self-serve dashboard flow and still would not add owner-only API guards.

---

## Proposed schema (migration SQL)

Apply as **two** ordered migrations (or one file with sections in this order). Mirror under `lib/sdk/supabase/migrations/` per repo convention.

1. **`YYYYMMDDHHMMSS_enforce_unique_brand_channel_slug.sql`** — **required first**; blocks brand-events APIs until applied.
2. **`YYYYMMDDHHMMSS_brand_channel_events.sql`** — event tables (depends on ownership invariant for API design, not FK).

### Step 1 — Enforce single owner per brand channel (required)

Run manually in Supabase SQL editor **before** applying the migration if you need to inspect duplicates; the migration itself must fail closed if duplicates remain.

**Pre-migration duplicate audit (run first, review output):**

```sql
-- Rows sharing the same brand_channel_slug (must return zero rows before unique index)
SELECT
    brand_channel_slug,
    COUNT(*) AS profile_count,
    array_agg(id ORDER BY updated_at DESC NULLS LAST, created_at DESC) AS profile_ids,
    array_agg(owner_address ORDER BY updated_at DESC NULLS LAST, created_at DESC) AS owner_addresses
FROM public.creator_profiles
WHERE brand_channel_slug IS NOT NULL
  AND btrim(brand_channel_slug) <> ''
GROUP BY brand_channel_slug
HAVING COUNT(*) > 1;
```

**Pre-migration cleanup (human decision — pick canonical owner per slug, then clear others):**

```sql
-- Example: keep the most recently updated profile for 'chones', unlink the rest.
-- Repeat per slug returned by the audit query, or use a one-off script with explicit wallet choices.
WITH ranked AS (
    SELECT
        id,
        brand_channel_slug,
        owner_address,
        ROW_NUMBER() OVER (
            PARTITION BY brand_channel_slug
            ORDER BY updated_at DESC NULLS LAST, created_at DESC
        ) AS rn
    FROM public.creator_profiles
    WHERE brand_channel_slug IS NOT NULL
      AND btrim(brand_channel_slug) <> ''
)
UPDATE public.creator_profiles cp
SET brand_channel_slug = NULL,
    updated_at = now()
FROM ranked r
WHERE cp.id = r.id
  AND r.rn > 1;
```

Re-run the **duplicate audit** until it returns no rows. Document the chosen canonical `owner_address` per slug (e.g. Chones → seeded Hack Beta admin wallet from `docs/brand-channel-profile-link.md`).

**Migration (required — not optional):**

```sql
-- REQUIRED: at most one creator_profiles row per brand_channel_slug.
-- Brand-events owner lookup assumes this uniqueness; do not ship assertBrandChannelOwner without it.

CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_profiles_brand_channel_slug_unique
    ON public.creator_profiles (brand_channel_slug)
    WHERE brand_channel_slug IS NOT NULL;

COMMENT ON INDEX public.idx_creator_profiles_brand_channel_slug_unique IS
    'Single owner per brand channel; required for assertBrandChannelOwner and profile slug upsert conflicts.';
```

**Profile upsert (implementation follow-up):** when setting `brand_channel_slug`, rely on DB unique violation (HTTP 409) if another profile already holds that slug — in addition to Brand Pass checks in `app/api/creator-profiles/upsert/route.ts`.

### Step 2 — Brand channel event tables

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
- **Step 1 unique index is a hard dependency** for owner authorization below; event tables alone do not define channel ownership.

---

## Ownership check (server)

**Prerequisite:** Step 1 unique index `idx_creator_profiles_brand_channel_slug_unique` applied and duplicate audit clean.

Add `lib/channels/assert-brand-channel-owner.ts`:

```ts
/**
 * Owner resolution relies on DB uniqueness: at most one creator_profiles row
 * per brand_channel_slug. Query by slug only — never LIMIT 1 without the index.
 */
export async function getBrandChannelOwnerAddress(
  slug: BrandChannelSlug
): Promise<string | null> {
  // SELECT owner_address FROM creator_profiles
  // WHERE brand_channel_slug = slug   -- exact match; slug validated as BrandChannelSlug
  // Expect 0 or 1 row (1 enforced by idx_creator_profiles_brand_channel_slug_unique).
}

export async function assertBrandChannelOwner(
  walletAddress: string,
  slug: BrandChannelSlug
): Promise<void> {
  const owner = await getBrandChannelOwnerAddress(slug);
  if (!owner || owner.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new BrandChannelForbiddenError(); // HTTP 403 — not owner or channel unassigned
  }
}

/** Implementation follow-up: if a query ever returns >1 row, log + 500 (index violated). */
```

**Semantics:**

| `getBrandChannelOwnerAddress` result | `assertBrandChannelOwner` |
|--------------------------------------|---------------------------|
| `null` (no profile linked to slug) | 403 for mutate APIs |
| address ≠ session wallet | 403 |
| address = session wallet | allow (plus Brand Pass where already required) |

Non-owner with their **own** `brand_channel_slug` on profile may create events only for **their** slug, not another brand’s.

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
- Second profile attempting same `brand_channel_slug` on upsert → 409 (unique index).
- Event page renders chosen videos (integration or API + component test).

---

## UI plan

### 1. Uploads History — “New event” (brand owners only)

**File:** `components/UserProfile/list-uploaded-assets/ListUploadedAssets.tsx` (header row next to existing controls).

**Visibility:** Show **New event** only when the session wallet is the exclusive owner: `creator_profiles.brand_channel_slug` is non-null for the viewer **and** `GET /api/brand-channel-events/ownership?brand=<slug>` returns `{ isOwner: true }` (server uses the same unique-index-backed lookup as `assertBrandChannelOwner`).

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

- [ ] **Step 1** unique index applied; duplicate audit query returns zero rows in production.
- [ ] Owner sees **New event** on Uploads History; non-owner does not (UI) and receives 403 on API.
- [ ] FAIR (or equivalent) appears on `/chones` Events grid like HACKATHON BETA.
- [ ] Event detail shows only selected library videos.
- [ ] Lint, typecheck, unit/integration tests green in CI.
