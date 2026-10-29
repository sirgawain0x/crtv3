# Creator social profile links (Orb, Instagram, X)

Creators can add optional **public link-outs** on their profile page. Values are stored as canonical HTTPS URLs, validated on write, and re-sanitized before render so stale or malformed DB rows never become clickable links.

## Where it appears

| Surface | Behavior |
|---------|----------|
| `/creator/[address]` | `CreatorProfileHeader` → `CreatorSocialLinks` (icon buttons, new tab) |
| **Profile → MeTokens → Creator Profile** | `CreatorProfileManager` form fields for Orb, Instagram, and X |

## Storage

| Column | Canonical form |
|--------|----------------|
| `creator_profiles.social_orb_url` | `https://orb.club/p/{handle-or-0xaddress}` |
| `creator_profiles.social_instagram_url` | `https://instagram.com/{handle}` |
| `creator_profiles.social_x_url` | `https://x.com/{handle}` |

Migration: `supabase/migrations/20261027120000_add_creator_social_urls.sql`.

## Write path

`POST /api/creator-profiles/upsert` (BotID + rate limit + **wallet auth** for `owner_address`):

1. Only fields present in the JSON body are updated (omitted fields are not cleared).
2. Social fields run through `validateAndNormalizeSocialPayload` in `lib/creator/validate-social-payload.ts`.
3. On failure: `400` with `{ error: "Invalid social profile links", fieldErrors: { … } }`.

Brand channel slug rules are unchanged; see [brand channel profile links](./brand-channel-profile-link.md).

## Normalization rules

Implementation: `lib/creator/social-profile-urls.ts`. Unit tests: `lib/creator/*.test.ts`, `components/Creator/CreatorSocialLinks.test.tsx`.

### Host allowlist

Only these hostnames are accepted when the user pastes a full URL:

| Platform | Allowed hosts |
|----------|----------------|
| Orb | `orb.club`, `www.orb.club` |
| Instagram | `instagram.com`, `www.instagram.com` |
| X | `x.com`, `www.x.com`, `twitter.com`, `www.twitter.com` |

Other domains are rejected with a field-specific error.

### Input formats

| Input | Orb | Instagram | X |
|-------|-----|-----------|---|
| Empty / whitespace | Cleared (`null`) | Cleared | Cleared |
| `@handle` | Built as `orb.club/p/handle` (leading `@` stripped) | Built as `instagram.com/handle` | Built as `x.com/handle` |
| `handle` (no `@`, no `/`) | Built as Orb profile URL | Built as Instagram URL | Built as X URL |
| `host/path` without scheme | Parsed after `https://` prefix | Same | Same |
| Full `http(s)://…` URL | Must match allowlist + path rules | Same | Same |

URLs must use `http:` or `https:` only. Strings starting with `@` are treated as handles, not URLs (`parseHttpSocialUrl` returns null for `@…`).

### Orb-specific constraints

- Profile URLs must use path **`/p/{key}`** — club URLs (`/c/…`) and other paths are rejected.
- Profile key: wallet `0x` + 40 hex (stored lowercase) or `[\w.-]{1,100}` without `..`.
- Path segments are `decodeURIComponent`-safe; malformed encoding fails validation.

### Instagram-specific constraints

- Rejects non-profile paths: `p`, `reel`, `reels`, `stories`, `explore`.
- Handle: `[A-Za-z0-9._]{1,30}`.

### X-specific constraints

- Rejects reserved first segments: `home`, `intent`, `share`, `i`, `hashtag`, `search`.
- Handle: `[A-Za-z0-9_]{1,15}` (X username rules).

## Read path (public pages)

`CreatorSocialLinks` calls `sanitizeStoredSocialUrl` per platform before rendering. If normalization fails, that icon is omitted (fail closed).

Public creator fetch selects social columns in `app/creator/[address]/page.tsx`.

## Troubleshooting

### Save returns 400 with field errors

Match the message to the rules above (wrong host, Instagram reel URL, X reserved path, invalid handle length).

### Link saved but not visible on `/creator/…`

Stored value may predate stricter validation. Re-save from Creator Profile to rewrite canonical URLs, or fix the row in Supabase.

### 403 on upsert

BotID flagged the request, or wallet session does not control `owner_address` (`requireWalletAuthFor`).

## Related docs

- [Brand channel profile links](./brand-channel-profile-link.md)
- [Predictions](./predictions.md) — separate Reality.eth social **bot** cron (market announcements)
