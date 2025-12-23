# IPFS Gateway Fallback Implementation

## Overview
This implementation adds automatic fallback support for IPFS gateways, converting failing gateway URLs (like Lighthouse gateway returning 503 errors) to alternative, more reliable gateways.

## Problem
- Lighthouse gateway (`gateway.lighthouse.storage`) was returning 503 errors
- Google Cloud Storage URLs from Livepeer AI were returning 404 errors
- Images were failing to load throughout the application

## Solution
Created a comprehensive gateway fallback system that:
1. Detects failing gateways automatically
2. Converts IPFS URLs to alternative gateways (ipfs.io, Cloudflare, Pinata, etc.)
3. Provides fallback URLs for image loading
4. Updates all image components to use gateway conversion

## Files Created

### `lib/utils/image-gateway.ts`
New utility module providing:
- `extractIpfsHash()` - Extracts IPFS hash from various URL formats
- `convertIpfsGateway()` - Converts IPFS URL to use a different gateway
- `getAllIpfsGateways()` - Gets all possible gateway URLs for an IPFS hash
- `isFailingGateway()` - Checks if a URL uses a known failing gateway
- `convertFailingGateway()` - Converts failing gateway URLs to alternatives
- `parseIpfsUriWithFallback()` - Enhanced IPFS URI parser with fallback support
- `getImageUrlWithFallback()` - React hook-friendly function for image URLs with fallbacks

### `components/ui/gateway-image.tsx`
New Next.js Image wrapper component that:
- Automatically converts failing gateways on load
- Handles image loading errors with fallback URLs
- Provides seamless integration with existing Image components

## Files Modified

### `lib/helpers.ts`
- Updated `parseIpfsUri()` to use the new fallback system
- Now automatically converts failing gateways to ipfs.io (most reliable)

### `components/Videos/VideoThumbnail.tsx`
- Added gateway conversion for database thumbnails
- Added gateway conversion for Livepeer VTT thumbnails
- Ensures all thumbnail URLs use reliable gateways

### `components/UserProfile/AvatarUpload.tsx`
- Added gateway conversion for avatar URLs
- Ensures avatars load from reliable gateways

### `components/UserProfile/CreatorProfileManager.tsx`
- Added gateway conversion for avatar preview images
- Ensures profile images display correctly

### `components/UserProfile/MemberCard.tsx`
- Added gateway conversion for NFT metadata images
- Ensures NFT images load from reliable gateways

## Gateway Priority Order
The system uses actual IPFS gateways in this order:
1. `https://w3s.link/ipfs` (Storacha/web3.storage - fast and reliable)
2. `https://gateway.pinata.cloud/ipfs` (Pinata - reliable)
3. `https://dweb.link/ipfs` (Protocol Labs - standard IPFS)
4. `https://4everland.io/ipfs` (4everland - decentralized)
5. `https://ipfs.io/ipfs` (public gateway - fallback)
6. `https://gateway.lighthouse.storage/ipfs` (existing content fallback)

## Usage Examples

### Basic Conversion
```typescript
import { convertFailingGateway } from '@/lib/utils/image-gateway';

const originalUrl = 'https://gateway.lighthouse.storage/ipfs/bafy...';
const convertedUrl = convertFailingGateway(originalUrl);
// Returns: 'https://w3s.link/ipfs/bafy...'
```

### Using GatewayImage Component
```typescript
import { GatewayImage } from '@/components/ui/gateway-image';

<GatewayImage
  src="https://gateway.lighthouse.storage/ipfs/bafy..."
  alt="My image"
  width={500}
  height={300}
/>
```

### Using parseIpfsUri (automatic conversion)
```typescript
import { parseIpfsUri } from '@/lib/helpers';

const ipfsUrl = parseIpfsUri('ipfs://bafy...');
// Automatically uses w3s.link (Storacha) gateway
```

## Benefits
1. **Automatic Fallback**: No manual intervention needed when gateways fail
2. **Improved Reliability**: Uses multiple gateways for redundancy
3. **Backward Compatible**: Existing code continues to work
4. **Performance**: Uses fastest/most reliable gateways first
5. **Future-Proof**: Easy to add new gateways or update priority order

## Notes
- Google Cloud Storage URLs (404 errors) are kept as-is since they're not IPFS URLs and can't be converted
- The system preserves non-IPFS URLs unchanged
- Gateway conversion happens at display time, not at upload time
- Uploads still use Lighthouse, but display URLs are converted to Storacha (w3s.link) gateway
- All gateways are actual IPFS gateways for proper decentralized access
- See `STORACHA_MIGRATION_GUIDE.md` for migrating uploads to Storacha

## Testing
To test the implementation:
1. Check browser console for any remaining gateway errors
2. Verify images load correctly throughout the application
3. Test with various IPFS URL formats (ipfs://, gateway URLs, direct hashes)

