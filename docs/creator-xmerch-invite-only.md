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

`/creator/[address]` → `CreatorXmerchSection` renders only when `enabled === true` and at least one valid store or featured URL exists. Store icon and featured chips open `XmerchStoreEmbedModal` (sandboxed iframe).
