# Live Chat & Comments Implementation

## Overview

Two separate systems have been implemented to handle different use cases:

1. **Live Chat** - For livestreaming (real-time, ephemeral, high-volume)
2. **Video Comments** - For video uploads (persistent, threaded, structured)

## Architecture

### Live Chat System

**Purpose**: Real-time chat during livestreams

**Technology**: XMTP (decentralized messaging)

**Components**:
- `components/Live/LiveChat.tsx` - Live chat UI component
- `lib/hooks/xmtp/useLiveChat.ts` - Live chat hook with optimizations

**Features**:
- ✅ Session-based groups (one per stream session)
- ✅ Message rate limiting (5 messages per 10 seconds)
- ✅ Auto-cleanup of old messages (10 minute retention)
- ✅ Optimized for high message volume
- ✅ Real-time message streaming
- ✅ Tip integration
- ✅ Compact UI for livestreams

**Usage**:
```tsx
import { LiveChat } from "@/components/Live/LiveChat";

<LiveChat
  streamId={streamId}
  sessionId={sessionId}
  creatorAddress={creatorAddress}
  viewerCount={viewerCount}
/>
```

### Video Comments System

**Purpose**: Persistent comments on video uploads

**Technology**: Supabase (database-backed)

**Components**:
- `components/Videos/VideoComments.tsx` - Comments UI component
- `lib/hooks/video/useVideoComments.ts` - Comments hook
- `services/video-comments.ts` - Server-side comment operations
- `supabase/migrations/20250115_create_video_comments.sql` - Database schema

**Features**:
- ✅ Threaded comments (replies to comments)
- ✅ Like/unlike functionality
- ✅ Edit/delete own comments
- ✅ Pagination (load more)
- ✅ Persistent storage in database
- ✅ Structured UI with replies
- ✅ Character limit (2000 chars)

**Usage**:
```tsx
import { VideoComments } from "@/components/Videos/VideoComments";

<VideoComments
  videoAssetId={videoAsset.id}
  videoName={videoAsset.title}
/>
```

## Database Schema

### video_comments table
- `id` - Primary key
- `video_asset_id` - Foreign key to video_assets
- `parent_comment_id` - For threaded replies (null for top-level)
- `commenter_address` - Wallet address
- `content` - Comment text (max 2000 chars)
- `likes_count` - Number of likes (auto-updated)
- `replies_count` - Number of replies (auto-updated)
- `is_edited` - Whether comment was edited
- `is_deleted` - Soft delete flag
- `created_at`, `updated_at` - Timestamps

### comment_likes table
- `id` - Primary key
- `comment_id` - Foreign key to video_comments
- `liker_address` - Wallet address of person who liked
- `created_at` - Timestamp
- Unique constraint on (comment_id, liker_address)

## Integration Examples

### For Livestream Pages

```tsx
// app/live/[address]/page.tsx or components/Live/Broadcast.tsx
import { LiveChat } from "@/components/Live/LiveChat";

<LiveChat
  streamId={streamId}
  sessionId={sessionId} // e.g., Date.now() or stream session ID
  creatorAddress={user?.address}
  viewerCount={viewerCount}
/>
```

### For Video Upload Pages

```tsx
// app/discover/[id]/page.tsx or components/Videos/VideoDetails.tsx
import { VideoComments } from "@/components/Videos/VideoComments";

<VideoComments
  videoAssetId={videoAsset.id}
  videoName={videoAsset.title}
/>
```

## Migration Required

Before using the comments system, run the database migration:

```bash
# Apply the migration
npx supabase migration apply 20250115_create_video_comments
```

Or if using Supabase CLI:
```bash
supabase db push
```

## Key Differences

| Feature | Live Chat | Video Comments |
|---------|-----------|----------------|
| **Storage** | XMTP (decentralized) | Supabase (database) |
| **Persistence** | Ephemeral (10 min) | Permanent |
| **Threading** | ❌ No | ✅ Yes (replies) |
| **Rate Limiting** | ✅ Yes (5/10s) | ❌ No |
| **Edit/Delete** | ❌ No | ✅ Yes |
| **Likes** | ❌ No | ✅ Yes |
| **Pagination** | ❌ No (auto-cleanup) | ✅ Yes |
| **Use Case** | Livestreams | Video uploads |

## Next Steps

1. **Run Migration**: Apply the database migration for comments
2. **Integrate Components**: Add LiveChat to livestream pages, VideoComments to video pages
3. **Update VideoChat**: Decide whether to deprecate or keep VideoChat for backward compatibility
4. **Test**: Test both systems in their respective contexts

## Notes

- Live chat uses XMTP groups (one per session)
- Comments use Supabase with RLS policies
- Both systems support wallet-based authentication
- Comments support smart account addresses
- Live chat has automatic message cleanup to prevent memory issues


