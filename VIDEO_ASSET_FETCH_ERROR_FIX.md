# Video Asset Fetch Error Fix

## Issue Summary

**Error**: `Failed to get video asset by playback ID: TypeError: fetch failed`

**Root Cause**: Client components were directly calling server functions that use Next.js server-specific APIs (`cookies()` from `next/headers`). This is incompatible because:
- The `getVideoAssetByPlaybackId` function in `services/video-assets.ts` is marked as a server action (`"use server"`)
- It uses `createClient()` which calls `cookies()` - a Next.js server-only API
- Client components (marked with `"use client"`) cannot directly call functions that use server-only APIs

## Solution

Created a proper API route architecture that separates server-side database operations from client-side API calls.

### Changes Made

#### 1. Created New API Routes (3 files)

**`/app/api/video-assets/by-playback-id/[playbackId]/route.ts`**
- Handles GET requests to fetch video assets by playback ID
- Returns 404 if asset not found
- Returns 500 with error details on failure
- Uses async params (Next.js 15 compatibility)

**`/app/api/video-assets/by-asset-id/[assetId]/route.ts`**
- Handles GET requests to fetch video assets by Livepeer asset ID
- Returns 404 if asset not found
- Returns 500 with error details on failure
- Uses async params (Next.js 15 compatibility)

**`/app/api/video-assets/[id]/route.ts`**
- Handles GET requests to fetch video assets by database ID
- Validates that ID is a valid number
- Returns 404 if asset not found
- Returns 500 with error details on failure
- Uses async params (Next.js 15 compatibility)

#### 2. Created Client-Side Utility Functions

**`/lib/utils/video-assets-client.ts`**

Created three client-safe functions that can be called from client components:
- `fetchVideoAssetByPlaybackId(playbackId: string)` - Fetches asset by playback ID
- `fetchVideoAssetByAssetId(assetId: string)` - Fetches asset by Livepeer asset ID
- `fetchVideoAssetById(id: number)` - Fetches asset by database ID

All functions:
- Use standard `fetch()` API (safe for client components)
- Return `null` for 404 responses
- Throw errors with detailed messages for other failures
- Include proper error logging

#### 3. Updated Client Components (4 files)

**`/components/Videos/VideoCardGrid.tsx`**
- Changed import from `getVideoAssetByPlaybackId` to `fetchVideoAssetByPlaybackId`
- Updated function call to use the client-safe version

**`/components/Videos/VideoThumbnail.tsx`**
- Changed import from `getVideoAssetByPlaybackId` to `fetchVideoAssetByPlaybackId`
- Updated function call to use the client-safe version

**`/components/Videos/VideoCard.tsx`**
- Changed import from `getVideoAssetByPlaybackId` to `fetchVideoAssetByPlaybackId`
- Updated function call to use the client-safe version

**`/components/Videos/VideoDetails.tsx`**
- Changed import from `getVideoAssetByPlaybackId` to `fetchVideoAssetByPlaybackId`
- Updated function call to use the client-safe version

## Architecture Pattern

### Before (Broken)
```
Client Component → Server Function (with cookies()) → Supabase
     ❌ FAILS: Client can't use server-only APIs
```

### After (Fixed)
```
Client Component → API Route → Server Function (with cookies()) → Supabase
     ✅ WORKS: API routes run on server
```

## Key Principles

1. **Server Actions**: Functions marked with `"use server"` that use server-only APIs (like `cookies()`) should only be called from:
   - Server components
   - API routes
   - Server actions

2. **Client Components**: Components marked with `"use client"` should:
   - Use standard `fetch()` to call API routes
   - NOT directly import or call server functions that use server-only APIs

3. **Next.js 15 Compatibility**: 
   - Dynamic route params are now async and must be awaited
   - Use `Promise<{ paramName: string }>` type for params

## Testing

After these changes:
1. ✅ All linter errors resolved
2. ✅ Client components can successfully fetch video asset data
3. ✅ No more "fetch failed" errors
4. ✅ Proper error handling with 404 and 500 responses
5. ✅ Next.js 15 compatibility maintained

## Files Modified

- `/app/api/video-assets/by-playback-id/[playbackId]/route.ts` (new)
- `/app/api/video-assets/by-asset-id/[assetId]/route.ts` (new)
- `/app/api/video-assets/[id]/route.ts` (new)
- `/lib/utils/video-assets-client.ts` (new)
- `/components/Videos/VideoCardGrid.tsx` (modified)
- `/components/Videos/VideoThumbnail.tsx` (modified)
- `/components/Videos/VideoCard.tsx` (modified)
- `/components/Videos/VideoDetails.tsx` (modified)

## API Endpoints

### GET /api/video-assets/by-playback-id/[playbackId]
Fetch video asset by Livepeer playback ID

**Response**: 
- 200: Returns video asset object
- 404: Asset not found
- 500: Server error

### GET /api/video-assets/by-asset-id/[assetId]
Fetch video asset by Livepeer asset ID (UUID)

**Response**: 
- 200: Returns video asset object
- 404: Asset not found
- 500: Server error

### GET /api/video-assets/[id]
Fetch video asset by database ID

**Response**: 
- 200: Returns video asset object
- 400: Invalid ID format
- 404: Asset not found
- 500: Server error

## Best Practices Applied

1. ✅ Proper separation of server and client code
2. ✅ RESTful API design
3. ✅ Comprehensive error handling
4. ✅ Type safety with TypeScript
5. ✅ Consistent error response format
6. ✅ Proper logging for debugging
7. ✅ Next.js 15 async params handling

