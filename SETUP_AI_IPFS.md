# Setup Guide: AI Images to IPFS

## Quick Setup

### 1. Environment Variables
Add these to your `.env.local` file:

```bash
# Required: Lighthouse IPFS API Key
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here

# Optional: Custom IPFS Gateway (defaults to Lighthouse)
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.lighthouse.storage/ipfs

# Optional: Base URL (only needed in production)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 2. Get Lighthouse API Key
1. Visit [https://lighthouse.storage/](https://lighthouse.storage/)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste into your `.env.local`

### 3. Verify Setup
```bash
# Run your dev server
npm run dev

# Test AI generation with automatic IPFS upload
# Generate an AI thumbnail - it will automatically be saved to IPFS
```

## What Was Changed

### New Files Created
1. **`lib/utils/ai-image-to-ipfs.ts`**
   - Utilities for converting images to File objects
   - Handles data URLs, blob URLs, and remote URLs
   
2. **`app/api/ai/upload-to-ipfs/route.ts`**
   - New API endpoint for uploading images to IPFS
   - Converts any image URL to IPFS storage
   
3. **`AI_IPFS_INTEGRATION.md`**
   - Complete documentation of the integration
   - Usage examples and troubleshooting guide

### Modified Files
1. **`app/api/ai/generate-thumbnail/route.ts`**
   - Now automatically uploads generated images to IPFS
   - Returns IPFS URLs instead of temporary data URLs
   
2. **`lib/utils/image-gateway.ts`**
   - Added warnings for deprecated Google Cloud Storage URLs
   - Improved documentation

## How It Works

### Before (The Problem)
```
User Request → Gemini AI → Generate Image → Google Cloud Storage
                                              ↓
                                           404 Error (expired)
```

### After (The Solution)
```
User Request → Gemini AI → Generate Image → IPFS Upload → Permanent Storage
                                              ↓
                                         IPFS URL (never expires)
```

## Features

✅ **Automatic IPFS Upload** - AI-generated images automatically saved to IPFS  
✅ **Permanent Storage** - No more 404 errors from expired URLs  
✅ **Graceful Fallbacks** - Falls back to data URLs if IPFS fails  
✅ **Zero Code Changes** - Existing code continues to work  
✅ **Multiple Gateways** - Uses fast, reliable IPFS gateways  

## Usage Examples

### Basic AI Generation (Automatic IPFS)
```typescript
// In your React component
const generateAiImage = async (prompt: string) => {
  const response = await fetch('/api/ai/generate-thumbnail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const result = await response.json();
  
  if (result.success) {
    // result.images[0].url is now an IPFS URL!
    console.log('IPFS URL:', result.images[0].url);
    console.log('Storage:', result.images[0].storage); // 'ipfs'
  }
};
```

### Manual IPFS Upload (Advanced)
```typescript
// Upload any image URL to IPFS
const uploadToIPFS = async (imageUrl: string) => {
  const response = await fetch('/api/ai/upload-to-ipfs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      imageUrl,
      filename: 'my-image.png' 
    }),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('IPFS URL:', result.ipfsUrl);
    console.log('IPFS Hash:', result.ipfsHash);
  }
};

// Works with data URLs, blob URLs, or HTTP URLs
await uploadToIPFS('data:image/png;base64,...');
await uploadToIPFS('blob:http://localhost:3000/...');
await uploadToIPFS('https://example.com/image.png');
```

## Testing

### Test the Upload Endpoint
```bash
curl -X POST http://localhost:3000/api/ai/upload-to-ipfs \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"data:image/png;base64,iVBORw0KGgo...","filename":"test.png"}'
```

### Test AI Generation with IPFS
```bash
curl -X POST http://localhost:3000/api/ai/generate-thumbnail \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a futuristic city at sunset"}'
```

Expected response:
```json
{
  "success": true,
  "images": [{
    "url": "https://gateway.lighthouse.storage/ipfs/bafybeib...",
    "ipfsHash": "bafybeib...",
    "storage": "ipfs"
  }]
}
```

## Troubleshooting

### "IPFS upload failed, using data URL"
**Cause:** IPFS upload encountered an error  
**Solution:** 
- Check that `NEXT_PUBLIC_LIGHTHOUSE_API_KEY` is set correctly
- Verify your Lighthouse account has storage quota
- Check network connectivity

### Images still show 404
**Cause:** Using old AI-generated images from Google Cloud Storage  
**Solution:** 
- Regenerate the images - new ones will use IPFS
- Old Google Cloud Storage URLs cannot be recovered

### Slow IPFS image loading
**Cause:** Gateway performance issues  
**Solution:**
- The system uses multiple fallback gateways automatically
- Consider implementing image optimization

## Storage Considerations

### Lighthouse Free Tier
- **Total Storage:** 5GB
- **Average AI Image:** 500KB - 2MB
- **Capacity:** ~2,500+ AI-generated images

### Costs
- Free tier is generous for most use cases
- Paid plans available for larger storage needs
- One-time upload cost, no recurring fees

## Migration Guide

### For Existing Projects
1. Add environment variables to `.env.local`
2. Restart your dev server
3. Generate new AI images - they'll automatically use IPFS
4. Old images will show console warnings but continue to work (until they expire)

### No Code Changes Required
- Existing thumbnail upload code works as-is
- AI generation code works as-is
- All changes are backward compatible

## Next Steps

### Recommended Enhancements
1. **Optimize Images** - Compress before IPFS upload to save storage
2. **Batch Processing** - Upload multiple images in parallel
3. **Retry Logic** - Add automatic retry on temporary failures
4. **Caching** - Cache frequently accessed IPFS images

### Optional: Migrate to Storacha
Consider migrating from Lighthouse to Storacha (web3.storage):
- Better SDK and TypeScript support
- Improved performance
- Built on IPFS and Filecoin
- See `STORACHA_MIGRATION_GUIDE.md` for details

## Support

### Documentation
- Full integration docs: `AI_IPFS_INTEGRATION.md`
- IPFS setup guide: `IPFS_SETUP.md`
- Gateway fallback guide: `IPFS_GATEWAY_FALLBACK.md`

### Common Issues
- Check console for warning messages
- Verify environment variables are set
- Review Lighthouse dashboard for quota limits
- Test with the provided curl commands

## Summary

Your AI-generated images are now automatically saved to IPFS! 🎉

- ✅ No more 404 errors
- ✅ Permanent decentralized storage
- ✅ Automatic process, no code changes
- ✅ Graceful fallbacks if needed
- ✅ Production-ready

Just add your Lighthouse API key and start generating AI images - they'll automatically be stored on IPFS forever!

