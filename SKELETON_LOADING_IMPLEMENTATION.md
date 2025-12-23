# Skeleton Loading Implementation

## Overview
Added skeleton loading states to improve UX while images and thumbnails load from IPFS gateways.

## Changes Made

### 1. VideoThumbnail Component
Enhanced `components/Videos/VideoThumbnail.tsx` with multi-stage loading states:

#### Loading States
1. **Fetching Thumbnail URL** (from database or Livepeer)
   - Shows skeleton with play button skeleton
   - Replaces the Player component that was previously shown

2. **Loading Image** (from IPFS gateway)
   - Shows skeleton while Next.js Image loads
   - Smooth fade-in transition when loaded
   - Play button overlay only appears after image loads

3. **Error Handling**
   - If image fails to load, falls back to Player component
   - Graceful degradation with no broken states

#### Visual States
```
Loading URL → [Skeleton] → Loading Image → [Skeleton] → Loaded → [Thumbnail with Play Button]
                                            ↓ (on error)
                                          [Player]
```

### 2. GatewayImage Component
Enhanced `components/ui/gateway-image.tsx` with skeleton support:

#### Features
- Optional skeleton loader (`showSkeleton` prop, default: true)
- Skeleton shown while image loads
- Smooth fade-in transition when loaded
- Works with fallback gateway system
- Resets loading state when trying fallback URLs

#### Usage
```typescript
import { GatewayImage } from '@/components/ui/gateway-image';

// With skeleton (default)
<GatewayImage
  src="https://w3s.link/ipfs/bafy..."
  alt="Avatar"
  width={100}
  height={100}
  className="rounded-full"
/>

// Without skeleton
<GatewayImage
  src="https://w3s.link/ipfs/bafy..."
  alt="Avatar"
  width={100}
  height={100}
  showSkeleton={false}
/>
```

## Benefits

### User Experience
1. **No Flash of Unstyled Content**: Smooth skeleton-to-content transition
2. **Clear Loading States**: Users know content is loading
3. **Professional Feel**: Polished loading experience
4. **Reduced Perceived Wait Time**: Skeleton loaders make wait feel shorter

### Performance
1. **Non-blocking**: Skeletons render immediately
2. **Smooth Transitions**: CSS opacity transitions for better performance
3. **Lazy Loading**: Images still use `loading="lazy"` for off-screen optimization

### Developer Experience
1. **Automatic**: Works out of the box with existing components
2. **Customizable**: Can disable skeleton if needed
3. **Consistent**: Same skeleton pattern across all images

## Implementation Details

### Skeleton Component
Uses the existing `components/ui/skeleton.tsx`:
- Animated pulse effect
- Customizable via className
- Matches the size of the content it replaces

### Loading State Management
```typescript
const [imageLoading, setImageLoading] = useState(true);

// Reset on URL change
useEffect(() => {
  setImageLoading(true);
}, [thumbnailUrl]);

// Complete on load
<Image
  onLoadingComplete={() => setImageLoading(false)}
  onError={() => setImageLoading(false)}
/>
```

### Transition Strategy
```css
/* Smooth fade-in */
className={`transition-opacity duration-300 ${
  imageLoading ? 'opacity-0' : 'opacity-100'
}`}
```

## Components Updated

### VideoThumbnail
- ✅ Skeleton while fetching thumbnail URL
- ✅ Skeleton while image loads
- ✅ Smooth fade-in transition
- ✅ Play button only shows after load
- ✅ Error handling with Player fallback

### GatewayImage
- ✅ Optional skeleton support
- ✅ Works with gateway fallback system
- ✅ Smooth transitions
- ✅ Customizable via props

## Where Skeletons Appear

### Video Thumbnails
- VideoCard components in grids
- Discover page
- Profile page uploaded videos
- Homepage video sections

### Images (via GatewayImage)
- Avatar images
- NFT images in MemberCard
- Profile images
- Any image using GatewayImage component

### Existing Skeleton Implementations
- VideoCardSkeleton: Full video card skeleton in grids
- ProposalListSkeleton: Proposal list loading states
- Various loading states throughout the app

## Testing

### Visual Testing
1. **Slow Network**: Use Chrome DevTools throttling to see skeletons
2. **Image Errors**: Test with invalid URLs to see fallback behavior
3. **Gateway Switching**: Watch skeleton when fallback gateways are tried

### Load Time Testing
```javascript
// Measure perceived load time
const start = performance.now();
// ... image loads ...
const end = performance.now();
console.log(`Load time: ${end - start}ms`);
```

## Performance Considerations

### Minimal Overhead
- Skeleton is just a `<div>` with CSS animation
- No additional network requests
- Pure CSS transitions (GPU accelerated)

### Memory Efficient
- Single `isLoading` boolean per component
- No heavy dependencies
- Reuses existing Skeleton component

## Future Improvements

### Potential Enhancements
1. **Shimmer Effect**: Add shimmer animation to skeletons
2. **Content Hints**: Show blurred preview while loading
3. **Progressive Loading**: Show low-res version first
4. **Predictive Loading**: Preload images before they're visible

### Configuration Options
```typescript
interface SkeletonOptions {
  showSkeleton?: boolean;
  skeletonVariant?: 'pulse' | 'shimmer' | 'wave';
  transitionDuration?: number;
  customSkeleton?: React.ReactNode;
}
```

## Related Documentation
- `IPFS_GATEWAY_FALLBACK.md` - Gateway fallback system
- `STORACHA_MIGRATION_GUIDE.md` - IPFS gateway migration
- `components/ui/skeleton.tsx` - Base skeleton component

