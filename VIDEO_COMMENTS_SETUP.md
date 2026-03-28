# Video Comments Table Setup

## Issue
The `video_comments` table doesn't exist in the database, causing the error:
```
Failed to fetch comments: Could not find the table 'public.video_comments' in the schema cache
```

## Solution

### Option 1: Apply via Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to the **SQL Editor**

2. **Run the Migration**
   - Copy the entire contents of `supabase/migrations/20250115_create_video_comments.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the migration

### Option 2: Apply via Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're in the project root
cd /Users/gawainbracyii/Developer/latest-crtv3

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

### What This Migration Creates

1. **`video_comments` table**
   - Stores persistent comments on video uploads
   - Supports threaded comments (replies)
   - Tracks likes, edits, and soft deletes

2. **`comment_likes` table**
   - Tracks who liked which comments
   - Prevents duplicate likes

3. **Functions & Triggers**
   - Auto-updates `replies_count` when replies are added
   - Auto-updates `likes_count` when comments are liked/unliked

4. **RLS Policies**
   - Anyone can read non-deleted comments
   - Anyone can create comments
   - Anyone can update comments (authorization handled in service layer)
   - Anyone can like/unlike comments

### Verification

After applying the migration, verify the tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('video_comments', 'comment_likes');

-- Check table structure
\d video_comments
\d comment_likes
```

The comments should now work properly on video detail pages!

