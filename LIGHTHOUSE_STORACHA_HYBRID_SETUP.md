# Lighthouse + Storacha Hybrid Storage Setup

## Overview

This implementation uses a hybrid storage approach:
- **Lighthouse (Primary)**: Better CDN distribution, especially for West Coast users. One-time $20 payment for 5GB lifetime storage.
- **Storacha (Backup)**: Free tier backup for redundancy and long-term persistence.

## Problem Solved

1. **West Coast Thumbnail Issue**: Thumbnails were not loading on the West Coast due to geographic distribution problems with Storacha-only storage.
2. **Storage Strategy**: Using Lighthouse as primary (better CDN) with Storacha as backup (free tier).

## Changes Made

### 1. Gateway Priority Updated (`lib/utils/image-gateway.ts`)
- **Lighthouse gateway is now first priority** for better CDN distribution
- Automatic fallback to Storacha, Pinata, and other gateways if Lighthouse fails
- Improved retry logic for thumbnail loading

### 2. Hybrid Storage Service (`lib/sdk/ipfs/lighthouse-service.ts`)
- New Lighthouse service for uploading files
- Uses Lighthouse API for direct uploads
- Returns IPFS hash and gateway URL

### 3. Enhanced IPFS Service (`lib/sdk/ipfs/service.ts`)
- **Primary**: Uploads to Lighthouse first (better CDN, especially West Coast)
- **Backup**: Automatically uploads to Storacha in background (non-blocking)
- **Fallback**: Uses Helia if both fail
- Automatically selects the best gateway based on available services

### 4. Thumbnail Upload Service (`lib/services/thumbnail-upload.ts`)
- Simplified to use the hybrid IPFS service
- Automatically handles Lighthouse + Storacha dual upload
- Better error handling and logging

### 5. Video Thumbnail Component (`components/Videos/VideoThumbnail.tsx`)
- Now uses `GatewayImage` component with automatic gateway retry
- Better handling of IPFS gateway failures
- Automatic fallback to multiple gateways

## Environment Variables

Add these to your `.env.local` file:

```bash
# Lighthouse API Key (Primary Storage)
# Get from: https://lighthouse.storage/
# One-time $20 payment for 5GB lifetime storage
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here

# Storacha (Backup Storage) - Optional but recommended
STORACHA_KEY=your_storacha_key
STORACHA_PROOF=your_storacha_proof

# IPFS Gateway (optional, defaults to Lighthouse if API key is set)
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.lighthouse.storage/ipfs
```

## Getting Lighthouse API Key

1. Go to [Lighthouse Storage](https://lighthouse.storage/)
2. Sign up for an account
3. Purchase the lifetime plan ($20 for 5GB)
4. Navigate to API Keys section
5. Create a new API key
6. Copy the API key and add it to your environment variables

## How It Works

### Upload Flow
1. **Primary Upload**: File is uploaded to Lighthouse first
   - Better CDN distribution (works well on West Coast)
   - Fast response time
   - Returns IPFS hash immediately

2. **Background Backup**: File is also uploaded to Storacha
   - Non-blocking (doesn't slow down the response)
   - Ensures redundancy
   - Free tier backup

3. **Fallback**: If Lighthouse fails, falls back to Helia + Storacha

### Thumbnail Loading Flow
1. **Primary Gateway**: Tries Lighthouse gateway first
   - Better geographic distribution
   - Works well on both East and West Coast

2. **Automatic Retry**: If Lighthouse gateway fails, automatically tries:
   - Storacha (w3s.link)
   - Pinata
   - Protocol Labs (dweb.link)
   - 4everland
   - Public IPFS gateway

3. **Fallback Image**: If all gateways fail, shows default thumbnail

## Benefits

### 1. Better Geographic Distribution
- Lighthouse has better CDN coverage, especially for West Coast
- Solves the thumbnail loading issue on West Coast

### 2. Cost-Effective
- Lighthouse: One-time $20 for 5GB (lifetime)
- Storacha: Free tier for backup
- Best of both worlds

### 3. Redundancy
- Files stored in both Lighthouse and Storacha
- If one service fails, the other provides backup
- Ensures long-term persistence

### 4. Automatic Fallback
- Smart gateway selection
- Automatic retry with multiple gateways
- Graceful error handling

## Migration Notes

- Existing Storacha-only uploads will continue to work
- New uploads will use Lighthouse as primary
- Old thumbnails will automatically use Lighthouse gateway (if available) or fallback to other gateways
- No breaking changes - fully backward compatible

## Testing

To test the West Coast thumbnail fix:

1. Set up Lighthouse API key
2. Upload a new thumbnail
3. Check that it loads on both East and West Coast
4. Verify that old thumbnails also load correctly (using gateway fallback)

## Troubleshooting

### Thumbnails Still Not Loading on West Coast
1. Verify Lighthouse API key is set correctly
2. Check that new uploads are going to Lighthouse
3. Clear browser cache
4. Check browser console for gateway errors

### Upload Failures
1. Check Lighthouse API key is valid
2. Verify you have storage space available (5GB limit)
3. Check network connectivity
4. Review server logs for detailed error messages

### Gateway Failures
- The system automatically tries multiple gateways
- If all fail, it shows the default thumbnail
- Check network connectivity
- Verify IPFS network is accessible

## Next Steps

1. Add Lighthouse API key to environment variables
2. Test thumbnail uploads
3. Verify West Coast thumbnail loading
4. Monitor storage usage (5GB limit on Lighthouse)
