# Supabase Upsert Fix

## Issue
The error "duplicate key value violates unique constraint 'creator_profiles_owner_address_key'" occurs when trying to upsert a creator profile that already exists.

## Root Cause
Supabase's `upsert` method by default uses the primary key (`id`) for conflict resolution, but we need it to use the `owner_address` column since that's our unique constraint.

## Solution Applied
Added `onConflict: 'owner_address'` parameter to all upsert operations:

```javascript
.upsert({
  owner_address: owner_address.toLowerCase(),
  username,
  bio,
  avatar_url,
  updated_at: new Date().toISOString(),
}, {
  onConflict: 'owner_address'  // This tells Supabase to use owner_address for conflict resolution
})
```

## Files Updated
1. `app/api/creator-profiles/upsert/route.ts` - Main upsert endpoint
2. `app/api/creator-profiles/route.ts` - PUT method for profile updates

## How It Works
- **If profile doesn't exist**: Creates a new profile
- **If profile exists**: Updates the existing profile with the same `owner_address`
- **No more duplicate key errors**: Properly handles the unique constraint

## Alternative Approach (if needed)
If the `onConflict` approach doesn't work, we can implement a manual upsert:

```javascript
// Check if profile exists
const { data: existing } = await supabase
  .from('creator_profiles')
  .select('id')
  .eq('owner_address', owner_address.toLowerCase())
  .single();

if (existing) {
  // Update existing profile
  const result = await supabase
    .from('creator_profiles')
    .update({ username, bio, avatar_url, updated_at: new Date().toISOString() })
    .eq('owner_address', owner_address.toLowerCase())
    .select();
} else {
  // Create new profile
  const result = await supabase
    .from('creator_profiles')
    .insert({ owner_address: owner_address.toLowerCase(), username, bio, avatar_url })
    .select();
}
```

## Testing
The avatar upload should now work without duplicate key errors.
