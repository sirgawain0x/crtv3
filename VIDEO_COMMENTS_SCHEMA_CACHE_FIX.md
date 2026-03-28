# Fix: Schema Cache Error for video_comments

## Issue
Even after applying the migration, you're seeing:
```
Failed to fetch comments: Could not find the table 'public.video_comments' in the schema cache
```

## Cause
The table exists in the database, but Supabase's API schema cache hasn't been refreshed yet. This is common when tables are created directly via SQL.

## Solutions (try in order)

### Option 1: Refresh Schema Cache in Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Look for **Schema Cache** or **Refresh Schema** button
4. Click **Refresh** or **Reload Schema**
5. Wait 30 seconds, then refresh your app

### Option 2: Restart Your Development Server
```bash
# Stop your dev server (Ctrl+C)
# Then restart it
npm run dev
# or
yarn dev
```

### Option 3: Wait for Auto-Refresh
Supabase usually refreshes the schema cache automatically within 1-2 minutes. Try refreshing your browser after waiting.

### Option 4: Force Schema Refresh via SQL
Run this in your Supabase SQL Editor:
```sql
-- This doesn't actually refresh the cache, but can sometimes trigger it
SELECT pg_notify('schema_refresh', 'video_comments');
```

### Option 5: Verify Tables Exist
Run this query to confirm tables are created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('video_comments', 'comment_likes');
```

If both tables appear, they exist - it's just a cache issue.

## Prevention
For future migrations, use Supabase's migration system instead of raw SQL in the dashboard to ensure proper cache invalidation:
```bash
supabase migration new create_video_comments
# Then apply with:
supabase db push
```

