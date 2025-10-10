# Video View Count Sync Setup

## Overview

This project uses a **Hybrid Approach** to sync video view counts from Livepeer to Supabase, optimized for Vercel's Hobby plan.

### How It Works

1. **Client-Side Sync** (Primary): When users browse videos, view counts sync automatically with smart rate limiting
2. **Daily Cron Job** (Backup): Catches videos with low traffic that don't get client-side syncing

This approach provides:
- ✅ Near real-time updates for popular videos
- ✅ Daily catch-all for unpopular videos
- ✅ Zero extra cost on Hobby plan
- ✅ Stays within function invocation limits

---

## Setup Instructions

### 1. Generate CRON_SECRET

Generate a secure random string for authenticating cron job requests:

```bash
openssl rand -base64 32
```

### 2. Add to Local Environment

Create or update `.env.local`:

```bash
# Vercel Cron Job Authentication
CRON_SECRET=paste-your-generated-secret-here
```

### 3. Add to Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: (the same secret from step 1)
   - **Environment**: Production, Preview, Development

### 4. Deploy to Vercel

The cron job configuration is already in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/video-assets/sync-views/cron",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs **daily at 2:00 AM** (whenever between 2:00-2:59 AM on Hobby plan).

Simply push your code to trigger a deployment:

```bash
git add .
git commit -m "feat: add hybrid view count syncing with cron job"
git push
```

---

## How It Works

### Client-Side Syncing

**File**: `components/Videos/VideoCard.tsx`

- Each video card checks if it should sync when rendered
- Uses `localStorage` to track last sync time per video
- Only syncs if **>1 hour** has passed since last sync
- Only syncs **published** videos

**Benefits:**
- Popular videos get frequent updates as users browse
- Automatic rate limiting prevents excessive API calls
- No server infrastructure needed

### Daily Cron Job

**Endpoint**: `/api/video-assets/sync-views/cron`

- Runs every day at 2:00 AM
- Fetches ALL published videos from database
- Syncs views from Livepeer in batches of 10
- Only updates database if view count changed

**Benefits:**
- Catches videos with zero/low traffic
- Ensures all videos stay up-to-date
- Provides reliable data for leaderboards/rankings

---

## Testing

### Test Client-Side Sync

1. Open your app in browser
2. Navigate to any page with video cards
3. Open browser console
4. Check for logs: `"Failed to sync view count"` (should be silent if working)
5. Check localStorage: `view-sync-[playbackId]` keys should appear

### Test Cron Job Locally

You can manually trigger the cron endpoint:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/video-assets/sync-views/cron
```

**Expected response:**
```json
{
  "success": true,
  "totalVideos": 50,
  "successCount": 48,
  "updatedCount": 12,
  "errorCount": 2,
  "duration": "15.43s",
  "timestamp": "2025-01-11T10:30:00.000Z"
}
```

### Monitor Cron Job in Production

1. Go to Vercel Dashboard → Your Project
2. Navigate to **Deployments** → Click your deployment
3. Click **Functions** tab
4. Find `api/video-assets/sync-views/cron`
5. View logs to see execution history

---

## Rate Limits & Costs

### Vercel Hobby Plan Limits

- **Cron Jobs**: 2 per account, max 1/day frequency
- **Function Invocations**: 100,000/month
- **Function Duration**: 100 GB-hours/month

### Estimated Usage

**Client-Side Sync:**
- ~1 sync per video per hour (if viewed)
- Popular videos: ~24 syncs/day = ~720/month per video
- 100 videos: ~72,000 invocations/month ✅

**Daily Cron Job:**
- 1 execution/day = 30/month
- Each video in batch = 1 invocation
- 100 videos = 3,000 invocations/month ✅

**Total**: ~75,000 invocations/month (within limits) ✅

---

## Customization

### Change Cron Schedule

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/video-assets/sync-views/cron",
      "schedule": "0 2 * * *"  // Daily at 2 AM
    }
  ]
}
```

**Note**: On Hobby plan, frequency is limited to once per day regardless of schedule.

### Change Client-Side Rate Limit

Edit `components/Videos/VideoCard.tsx`:

```typescript
// Change from 1 hour to 2 hours
if (hoursSinceSync < 2) {
  return; // Skip sync, too soon
}
```

### Batch Size for Cron Job

Edit `app/api/video-assets/sync-views/cron/route.ts`:

```typescript
const BATCH_SIZE = 10; // Process 10 videos at a time
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay
```

**Larger batches** = faster but more aggressive  
**Smaller batches** = slower but gentler on API limits

---

## Upgrading to Pro Plan

If you need more frequent syncing, upgrade to **Vercel Pro** ($20/month):

### Pro Plan Benefits

- ✅ Up to 40 cron jobs
- ✅ Run every 15 minutes minimum (vs once/day)
- ✅ 1,000,000 function invocations/month (10x more)
- ✅ Precise timing (runs exactly when scheduled)
- ✅ Overage charges instead of account pausing

### Example Pro Schedule

```json
{
  "crons": [
    {
      "path": "/api/video-assets/sync-views/cron",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

---

## Troubleshooting

### Client-Side Sync Not Working

**Issue**: Views not updating when browsing videos

**Check:**
1. Open browser console for errors
2. Verify video status is "published"
3. Check localStorage for `view-sync-*` keys
4. Check Network tab for API calls to `/sync-views/`

**Fix**: Clear localStorage and refresh

### Cron Job Failing

**Issue**: Daily sync not running or returning errors

**Check:**
1. Verify `CRON_SECRET` environment variable is set in Vercel
2. Check Vercel function logs for error details
3. Verify Livepeer API key has permissions
4. Check database connection (RLS policies)

**Fix**: 
- Redeploy to ensure latest code
- Check function execution logs in Vercel dashboard

### Rate Limiting

**Issue**: Getting 429 errors from Livepeer

**Fix**: Increase `DELAY_BETWEEN_BATCHES` or decrease `BATCH_SIZE` in cron job

### Exceeding Function Limits

**Issue**: Approaching 100k invocation limit

**Fix**: 
1. Increase client-side rate limit from 1 hour to 2-3 hours
2. Consider upgrading to Pro plan
3. Monitor usage in Vercel dashboard

---

## Monitoring

### Key Metrics to Track

1. **Function Invocations**: Vercel Dashboard → Usage
2. **Cron Success Rate**: Function logs (should be near 100%)
3. **View Count Accuracy**: Compare Livepeer vs Database
4. **Sync Latency**: How long until new views appear

### Recommended Monitoring

Set up alerts for:
- Function invocations > 80,000/month (80% of limit)
- Cron job failures > 2 consecutive days
- Database update errors > 10% of attempts

---

## Summary

✅ **Hybrid approach implemented**  
✅ **Client-side sync with 1-hour rate limiting**  
✅ **Daily cron job at 2 AM for backup syncing**  
✅ **Optimized for Vercel Hobby plan limits**  
✅ **Zero additional costs**

The system will automatically keep view counts accurate while staying well within the free tier limits!

