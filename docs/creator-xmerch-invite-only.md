# Creator xMerch (invite-only)

Creative Merch on public creator profiles is **invite-only**: platform admins mark a creator as having an active Creative Merch product. Creators cannot self-serve store or featured URLs in Profile → Creator Profile.

## Storage (pending migration)

Single JSONB column on `creator_profiles`:

```json
{
  "enabled": true,
  "storeUrl": "https://creative.xmerch.app",
  "featuredProductUrls": ["https://creative.xmerch.app/products/example"]
}
```

## Admin

- **UI:** `/admin/creator-xmerch` (platform admin wallet via `isPlatformAdmin`)
- **API:** `PATCH /api/creator-profiles/admin/xmerch` with wallet auth + platform admin check

## Public display

`/creator/[address]` → `CreatorXmerchSection` renders only when `enabled === true` and at least one valid store or featured URL exists. Up to **3** featured product URLs. If featured products are set, the profile shows responsive product cards (Open Graph image when available, otherwise the xMerch icon). If only a store URL is set, the profile shows the store button. Both open `XmerchStoreEmbedModal` (sandboxed iframe).
