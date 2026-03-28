# Client/Server Boundary Fix - Livepeer View Metrics

## Problem
Client components were directly importing and calling `fetchAllViews` from `app/api/livepeer/views.ts`, which uses `process.env.LIVEPEER_FULL_API_KEY`. This server-only environment variable gets stripped in the browser, causing the function to fail in client-side execution.

## Solution
Separated client and server responsibilities by creating proper API endpoints and updating all client components to use fetch calls instead of direct imports.

## Changes Made

### 1. Created New Read-Only API Endpoint
**File:** `app/api/livepeer/views/[playbackId]/route.ts`

- New server-side API route that fetches view metrics from Livepeer
- Does NOT update the database (read-only)
- Used by components that only need to display view counts
- Returns metrics in JSON format: `{ success, playbackId, viewCount, playtimeMins, legacyViewCount }`

### 2. Updated VideoCard Component
**File:** `components/Videos/VideoCard.tsx`

**Changes:**
- ✅ Removed direct import of `fetchAllViews`
- ✅ Kept localStorage rate-limiting logic in the component (1-hour cooldown)
- ✅ Now calls `GET /api/video-assets/sync-views/${playbackId}` 
- ✅ This endpoint fetches from Livepeer AND updates the database in one operation
- ✅ Updates localStorage only on successful sync
- ✅ Proper error handling maintained

**Why this approach:**
The existing sync endpoint already does exactly what VideoCard needs: fetch metrics from Livepeer and update the database. The localStorage rate-limiting ensures this only happens once per hour per video.

### 3. Updated VideoViewMetrics Component
**File:** `components/Videos/VideoViewMetrics.tsx`

**Changes:**
- ✅ Removed direct import of `fetchAllViews`
- ✅ Now calls `GET /api/livepeer/views/${playbackId}` (read-only endpoint)
- ✅ Proper error handling with loading states
- ✅ No database updates (display-only)

### 4. Updated ViewsComponent
**File:** `components/Player/ViewsComponent.tsx`

**Changes:**
- ✅ Removed direct import of `fetchAllViews`
- ✅ Now calls `GET /api/livepeer/views/${playbackId}` (read-only endpoint)
- ✅ Proper error handling with loading states
- ✅ No database updates (display-only)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Client Components (Browser)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  VideoCard.tsx (with rate-limiting)                              │
│  ├─→ GET /api/video-assets/sync-views/[playbackId]              │
│  │   └─→ Fetches from Livepeer + Updates DB                     │
│  │                                                                │
│  VideoViewMetrics.tsx (display only)                             │
│  ├─→ GET /api/livepeer/views/[playbackId]                        │
│  │   └─→ Fetches from Livepeer (read-only)                      │
│  │                                                                │
│  ViewsComponent.tsx (display only)                               │
│  └─→ GET /api/livepeer/views/[playbackId]                        │
│      └─→ Fetches from Livepeer (read-only)                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server-Side API Routes (Node.js)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /api/livepeer/views/[playbackId] (NEW)                          │
│  └─→ fetchAllViews() → Livepeer API                              │
│      └─→ Returns metrics (no DB update)                          │
│                                                                   │
│  /api/video-assets/sync-views/[playbackId] (EXISTING)            │
│  └─→ fetchAllViews() → Livepeer API                              │
│      └─→ Updates Supabase DB                                     │
│      └─→ Returns success + metrics                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server-Only Function                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  fetchAllViews() in app/api/livepeer/views.ts                    │
│  └─→ Uses process.env.LIVEPEER_FULL_API_KEY                      │
│  └─→ Calls Livepeer Studio API                                   │
│  └─→ Only imported by server-side routes                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Verification

Confirmed that `fetchAllViews` is now only imported in server-side API routes:
- ✅ `app/api/livepeer/views/[playbackId]/route.ts`
- ✅ `app/api/video-assets/sync-views/[playbackId]/route.ts`
- ✅ `app/api/video-assets/sync-views/cron/route.ts`

No client components import it directly anymore.

## Benefits

1. **Security**: API keys remain on the server and are never exposed to the browser
2. **Rate Limiting**: localStorage-based rate limiting in VideoCard prevents excessive API calls
3. **Separation of Concerns**: Display components use read-only endpoint, sync components use write endpoint
4. **Error Handling**: Proper error handling at both client and server levels
5. **Performance**: Reduced unnecessary database updates for display-only components

## Testing Recommendations

1. Test VideoCard view count syncing with localStorage rate-limiting
2. Verify view metrics display correctly in VideoViewMetrics and ViewsComponent
3. Check browser console for any environment variable errors (should be none)
4. Verify database updates only occur from VideoCard, not from display components
5. Test error handling when Livepeer API is unavailable

