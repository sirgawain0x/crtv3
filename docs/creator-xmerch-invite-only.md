# Creator xMerch (invite-only)

Creative Merch on public creator profiles is **invite-only**: platform admins mark a creator as having an active Creative Merch product. Creators cannot self-serve store or featured URLs in Profile → Creator Profile.

## Storage

JSON column on `creator_profiles`:

| Column | Shape |
|--------|--------|
| `social_xmerch` | `{ enabled, storeUrl, featuredProductUrls }` |

Example:

```json
{
  "enabled": true,
  "storeUrl": "https://creative.xmerch.app",
  "featuredProductUrls": ["https://creative.xmerch.app/products/example"]
}
```

Normalization and host allowlist (`*.xmerch.app`): `lib/creator/xmerch-profile.ts` (max **6** featured URLs).

## Admin

- **UI:** `/admin/creator-xmerch` — platform admin wallet (`requirePlatformAdmin` / `isPlatformAdmin`)
- **API:** `PATCH /api/creator-profiles/admin/xmerch`

### Request

```json
{
  "owner_address": "0x…",
  "social_xmerch": {
    "enabled": true,
    "storeUrl": "https://store.xmerch.app",
    "featuredProductUrls": ["https://store.xmerch.app/products/tee"]
  }
}
```

- **Update-only:** creator must already have a `creator_profiles` row (`404` if missing).
- Wallet auth headers from the signed-in admin session (same pattern as other admin panels).

### Guards

| Layer | Behavior |
|-------|----------|
| BotID Deep Analysis | `checkBotIdDeep()` — automated clients get `403` `{ error: "Access denied" }` |
| Rate limit | `rateLimiters.standard` |
| Platform admin | `requirePlatformAdmin` |
| Service role | Supabase service client required (`503` if unavailable) |

**Browser clients:** `instrumentation-client.ts` must list `PATCH /api/creator-profiles/admin/xmerch` in `initBotId({ protect: [...] })` so BotID headers attach on save. If admin saves fail with 403 in production, verify this registration matches the route and Vercel BotID Deep Analysis settings (`lib/middleware/botIdGuard.ts`).

External agents must **not** call this route; admin API keys are not a BotID bypass ([platform-api.md](./platform-api.md#botid-vs-platform-api-external-agents)).

## Public display

`/creator/[address]` → `CreatorXmerchSection` renders only when `enabled === true` and at least one valid store or featured URL exists. Up to **3** featured product URLs. If featured products are set, the profile shows responsive product cards (Open Graph image when available, otherwise the xMerch icon). If only a store URL is set, the profile shows the store button. Both open `XmerchStoreEmbedModal` (sandboxed iframe).

Tests: `app/api/creator-profiles/admin/xmerch/route.test.ts`, `components/Creator/CreatorXmerchSection.test.tsx`.
