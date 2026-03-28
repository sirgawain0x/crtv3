# Smart Account Authentication Architecture

## Overview

This application uses **Account Kit (EIP-4337 Smart Accounts)** for user authentication and wallet management, which differs from traditional Supabase JWT authentication.

## Architecture

### Two-Tier Authentication System

```text
┌─────────────────────────────────────────────────────────────┐
│                     User Authentication                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Account Kit (Frontend)                                       │
│  ├── Controller Wallet (EOA) - Signs transactions            │
│  └── Smart Account (SCA) - Holds funds & assets              │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Supabase (Backend)                                           │
│  ├── Service Role Key - Server operations                    │
│  └── Anon/Auth Key - Public read operations                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Why Not Standard Supabase Auth?

### Problem:
- Supabase RLS policies check `auth.jwt() ->> 'sub'` (Supabase user ID)
- Account Kit uses smart contract addresses (0x123...) as identifiers
- These two identifiers don't match, causing RLS violations

### Solution:
Use **Service Role Key** for server-side operations that need to bypass RLS.

## Implementation

### 1. Service Client (`lib/sdk/supabase/service.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

export const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};
```

### 2. Video Assets Service

Uses service client for:
- ✅ `createVideoAsset()` - Creating new video records
- ✅ `updateVideoAsset()` - Updating video metadata
- ✅ `updateVideoAssetMintingStatus()` - NFT minting updates

```typescript
export async function createVideoAsset(data) {
  const supabase = createServiceClient(); // Bypasses RLS
  
  const { data: result, error } = await supabase
    .from('video_assets')
    .insert({
      creator_id: smartAccountAddress, // Smart account address
      // ... other fields
    });
}
```

### 3. RLS Policies

Updated policies in `supabase/migrations/20250110_fix_video_assets_smart_account_auth.sql`:

```sql
-- Reads: Open to public for published content
CREATE POLICY "Public read access" ON video_assets
  FOR SELECT USING (status = 'published');

-- Writes: Service role only
CREATE POLICY "Service role can insert" ON video_assets
  FOR INSERT TO service_role WITH CHECK (true);
```

## Data Flow

### Video Upload Flow

```text
1. User (Smart Account) uploads video
   ↓
2. Frontend calls server action
   ↓
3. Server uses Service Client
   ↓
4. Supabase insert with creator_id = smart_account_address
   ↓
5. RLS bypassed (service role)
   ↓
6. ✅ Video created successfully
```

### Video Read Flow

```text
1. Anyone visits discover page
   ↓
2. Frontend queries Supabase
   ↓
3. Uses anon/authenticated client
   ↓
4. RLS allows reads for published videos
   ↓
5. ✅ Videos displayed
```

## Environment Variables

### Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # For public reads
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # For server writes

# Account Kit
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
```

### Security Notes

⚠️ **NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to the client!**

- ✅ Use in server actions (`"use server"`)
- ✅ Use in API routes (server-side only)
- ❌ Never import in client components
- ❌ Never bundle in frontend code

## Benefits of This Approach

### 1. **Simplified Authentication**
- No need to manage Supabase users separately
- Smart account address is the source of truth
- Users authenticated via Account Kit

### 2. **Better UX**
- Users use their existing wallets
- No password management
- Web3-native authentication

### 3. **Security**
- Service role operations are server-side only
- RLS still protects read operations
- Smart account addresses are cryptographically secure

### 4. **Flexibility**
- Easy integration with blockchain operations
- Compatible with gasless transactions
- Supports account abstraction features

## Common Operations

### Creating Content (Server-Side)

```typescript
"use server";

import { createServiceClient } from "@/lib/sdk/supabase/service";

export async function createContent(smartAccountAddress: string, data: any) {
  const supabase = createServiceClient();
  
  const { data: result, error } = await supabase
    .from('content_table')
    .insert({
      creator_id: smartAccountAddress, // Smart account, not JWT user
      ...data,
    });
    
  return result;
}
```

### Reading Content (Client or Server)

```typescript
import { createClient } from "@/lib/sdk/supabase/client";

export async function getPublishedVideos() {
  const supabase = createClient();
  
  // Uses anon key, RLS allows reads for published content
  const { data } = await supabase
    .from('video_assets')
    .select('*')
    .eq('status', 'published');
    
  return data;
}
```

## Troubleshooting

### Error: "new row violates row-level security policy"

**Cause:** Using regular client instead of service client for insert/update operations.

**Fix:** Use `createServiceClient()` for write operations.

```diff
- const supabase = await createClient(); // ❌ Wrong
+ const supabase = createServiceClient(); // ✅ Correct
```

### Error: "Missing SUPABASE_SERVICE_ROLE_KEY"

**Cause:** Environment variable not set.

**Fix:** Add to `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get the key from: Supabase Dashboard → Settings → API → service_role key

## Migration Guide

If you need to add RLS to a new table:

1. **Enable RLS:**
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

2. **Add Read Policy (Public):**
```sql
CREATE POLICY "public_read" ON your_table
  FOR SELECT TO anon, authenticated
  USING (true); -- or add your conditions
```

3. **Add Write Policy (Service Role):**
```sql
CREATE POLICY "service_write" ON your_table
  FOR INSERT TO service_role
  WITH CHECK (true);
```

4. **Update Service Functions:**
```typescript
export async function createRecord(data) {
  const supabase = createServiceClient(); // Use service client
  // ... your insert logic
}
```

## References

- [Account Kit Documentation](https://accountkit.alchemy.com/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [EIP-4337: Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [Service Role Key Security](https://supabase.com/docs/guides/api/api-keys)

## Questions?

For issues related to:
- **Smart Accounts:** Check `lib/hooks/accountkit/`
- **Supabase Operations:** Check `services/` and `lib/sdk/supabase/`
- **RLS Policies:** Check `supabase/migrations/`

