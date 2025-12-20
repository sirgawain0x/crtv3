# AI-Generated Images IPFS Integration

## Overview
This system automatically saves AI-generated images to IPFS for permanent, decentralized storage, replacing the temporary Google Cloud Storage URLs that were returning 404 errors.

## Problem Solved
Previously, AI-generated images from Livepeer were stored temporarily on Google Cloud Storage (`storage.googleapis.com/lp-ai-generate-com/media/`) which would return 404 errors when the temporary storage expired.

## Solution Architecture

### 1. **Client-Side Utilities** (`lib/utils/ai-image-to-ipfs.ts`)
Provides functions to convert various image URL formats to File objects:
- `dataUrlToFile()` - Converts base64 data URLs to File objects
- `urlToFile()` - Fetches remote images and converts to File objects
- `blobUrlToFile()` - Converts blob URLs to File objects
- `anyUrlToFile()` - Smart router that detects URL type and uses appropriate converter
- `generateAiImageFilename()` - Generates unique filenames for AI images

### 2. **Server-Side IPFS Upload API** (`app/api/ai/upload-to-ipfs/route.ts`)
New API endpoint that:
- Accepts image URLs (data URLs or HTTP/HTTPS URLs)
- Converts them to File objects on the server
- Uploads to IPFS via Lighthouse SDK
- Returns IPFS URL and hash for permanent storage

**Endpoint:** `POST /api/ai/upload-to-ipfs`

**Request Body:**
```json
{
  "imageUrl": "data:image/png;base64,..." or "https://...",
  "filename": "optional-filename.png"
}
```

**Response:**
```json
{
  "success": true,
  "ipfsUrl": "https://gateway.lighthouse.storage/ipfs/bafybeib...",
  "ipfsHash": "bafybeib..."
}
```

### 3. **Enhanced Gemini AI Generation** (`app/api/ai/generate-thumbnail/route.ts`)
Now automatically:
1. Generates images with Gemini 2.5 Flash
2. Uploads each generated image to IPFS via the new upload endpoint
3. Returns IPFS URLs instead of temporary data URLs
4. Falls back to data URLs if IPFS upload fails (with warning)

**Response Format:**
```json
{
  "success": true,
  "images": [
    {
      "url": "https://gateway.lighthouse.storage/ipfs/bafybeib...",
      "ipfsHash": "bafybeib...",
      "id": "gemini-1699999999999-abc123",
      "mimeType": "image/png",
      "storage": "ipfs"
    }
  ]
}
```

### 4. **Updated Image Gateway Utilities** (`lib/utils/image-gateway.ts`)
Enhanced to handle deprecated Google Cloud Storage URLs with warnings.

## How It Works

### For Gemini AI-Generated Images (Automatic)
```mermaid
graph LR
    A[User Request] --> B[Gemini API]
    B --> C[Generate Image]
    C --> D[Base64 Data]
    D --> E[Upload to IPFS API]
    E --> F[IPFS Storage]
    F --> G[Return IPFS URL]
    G --> H[Display Image]
```

1. User requests AI thumbnail generation
2. Gemini generates image as base64
3. Server automatically uploads to IPFS
4. IPFS URL returned to client
5. Image permanently stored and displayed

### For Custom Uploads (Existing Flow)
The existing thumbnail upload flow continues to work:
- Custom thumbnails → `uploadThumbnailToIPFS()` → IPFS
- Blob URLs → `uploadThumbnailFromBlob()` → IPFS

## Usage Examples

### Automatic IPFS Upload for AI Images
```typescript
// Just call the AI generation endpoint - IPFS upload is automatic
const response = await fetch('/api/ai/generate-thumbnail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'cyberpunk cityscape' }),
});

const result = await response.json();
// result.images[0].url is now an IPFS URL!
// result.images[0].storage === 'ipfs'
```

### Manual IPFS Upload (for other use cases)
```typescript
import { anyUrlToFile } from '@/lib/utils/ai-image-to-ipfs';
import { uploadThumbnailToIPFS } from '@/lib/services/thumbnail-upload';

// Convert any image URL to IPFS
const file = await anyUrlToFile(imageUrl, 'my-image.png');
if (file) {
  const result = await uploadThumbnailToIPFS(file, 'playback-id');
  console.log('IPFS URL:', result.thumbnailUrl);
}
```

### Using the Upload API Directly
```typescript
const response = await fetch('/api/ai/upload-to-ipfs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'data:image/png;base64,...',
    filename: 'ai-generated.png'
  }),
});

const result = await response.json();
if (result.success) {
  console.log('IPFS URL:', result.ipfsUrl);
  console.log('IPFS Hash:', result.ipfsHash);
}
```

## Benefits

### 1. **Permanent Storage**
- Images stored permanently on IPFS
- No more 404 errors from expired temporary URLs
- Decentralized storage ensures availability

### 2. **Automatic Process**
- No manual intervention needed
- AI generation automatically includes IPFS upload
- Seamless user experience

### 3. **Reliable Fallbacks**
- Falls back to data URLs if IPFS fails
- Multiple IPFS gateway options
- Graceful error handling

### 4. **Cost Efficient**
- One-time storage cost on IPFS
- No recurring fees for image hosting
- Utilizes existing Lighthouse infrastructure

### 5. **Backward Compatible**
- Existing custom upload flow unchanged
- Old blob URL handling still works
- Gradual migration of old images

## Environment Variables Required

```bash
# Lighthouse IPFS API Key (required)
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_api_key

# IPFS Gateway (optional, defaults to Lighthouse gateway)
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.lighthouse.storage/ipfs

# Base URL for internal API calls (optional, for production)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Image Gateway Priority

The system uses multiple IPFS gateways in priority order:
1. **w3s.link** (Storacha/web3.storage) - Primary, fast and reliable
2. **gateway.pinata.cloud** (Pinata) - Reliable fallback
3. **dweb.link** (Protocol Labs) - Standard IPFS gateway
4. **4everland.io** (4everland) - Decentralized option
5. **ipfs.io** - Public gateway fallback
6. **gateway.lighthouse.storage** - Keep for existing content

## Error Handling

### IPFS Upload Failures
If IPFS upload fails, the system:
1. Logs a warning to console
2. Returns the original data URL as fallback
3. Marks the image as `storage: 'temporary'`
4. Includes error details in response

### Network Errors
- Retries can be implemented in the upload endpoint
- Client receives appropriate error messages
- Graceful fallback to temporary URLs

## Migration Notes

### For Existing Code
- ✅ No changes needed for custom thumbnail uploads
- ✅ No changes needed for blob URL handling
- ✅ AI generation now returns IPFS URLs automatically

### For Old Livepeer URLs
- Old Google Cloud Storage URLs will show warnings in console
- These URLs will return 404 and should be regenerated
- Future AI generations will automatically use IPFS

## Monitoring and Debugging

### Console Messages
- **Success:** No special logging (clean operation)
- **IPFS Failure:** `"IPFS upload failed, using data URL: [error]"`
- **Deprecated URLs:** `"⚠️ Deprecated: Livepeer AI temporary storage URL detected..."`

### Response Indicators
Check the `storage` field in image responses:
- `"ipfs"` - Successfully stored on IPFS
- `"temporary"` - Fallback to data URL (check `ipfsError`)

## Performance Considerations

### Upload Time
- IPFS upload adds ~1-3 seconds to AI generation
- Acceptable tradeoff for permanent storage
- Parallel processing possible for multiple images

### Storage Limits
- Lighthouse free tier: 5GB total storage
- Average AI thumbnail: ~500KB - 2MB
- Capacity: 2,500+ AI-generated images

### Gateway Performance
- w3s.link provides fast CDN-backed access
- Multiple fallback gateways ensure reliability
- Gateway selection optimized for speed

## Future Enhancements

1. **Batch Upload Support**
   - Upload multiple AI images in parallel
   - Reduce overall generation time

2. **Storacha Migration**
   - Migrate from Lighthouse to Storacha (web3.storage)
   - Better SDK and performance

3. **Image Optimization**
   - Compress images before IPFS upload
   - Reduce storage costs and bandwidth

4. **Caching Layer**
   - Cache frequently accessed IPFS images
   - Improve load times for popular content

5. **Retry Logic**
   - Automatic retry on IPFS upload failures
   - Exponential backoff for network errors

## Testing

### Test IPFS Upload Endpoint
```bash
curl -X POST http://localhost:3000/api/ai/upload-to-ipfs \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"data:image/png;base64,iVBORw0KG...","filename":"test.png"}'
```

### Test AI Generation with IPFS
```bash
curl -X POST http://localhost:3000/api/ai/generate-thumbnail \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a beautiful sunset over mountains"}'
```

### Verify IPFS Storage
Check the response for:
- `storage: 'ipfs'` field
- `ipfsUrl` starting with gateway URL
- `ipfsHash` for verification

## Troubleshooting

### IPFS Upload Fails
1. Check `NEXT_PUBLIC_LIGHTHOUSE_API_KEY` is set
2. Verify Lighthouse account has storage quota
3. Check network connectivity to Lighthouse API
4. Review console logs for specific errors

### Images Still Return 404
1. Ensure you're using newly generated images
2. Old images on Google Cloud Storage can't be recovered
3. Regenerate AI images to get IPFS versions

### Slow Image Loading
1. Try different IPFS gateways using `convertFailingGateway()`
2. Check gateway status at status.pinata.cloud
3. Consider implementing image optimization

## Summary

The AI-IPFS integration provides a complete solution for permanent storage of AI-generated images:
- ✅ Automatic IPFS upload on generation
- ✅ Permanent decentralized storage
- ✅ No more 404 errors
- ✅ Graceful fallbacks
- ✅ Easy to use APIs
- ✅ Production-ready

All future AI-generated images are now automatically saved to IPFS, ensuring they remain accessible permanently without requiring any changes to existing code.

