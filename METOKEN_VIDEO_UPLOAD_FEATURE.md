# MeToken Video Upload Integration

## Overview
This document describes the integration of MeToken functionality into the video upload flow. Users can now gate their video content behind MeToken ownership, requiring viewers to hold a minimum balance of their MeToken to access the content.

## Changes Made

### 1. Database Schema
Added two new columns to the `video_assets` table:
- `requires_metoken` (BOOLEAN): Indicates whether the video requires MeToken ownership for access
- `metoken_price` (DECIMAL): The minimum MeToken balance required to access the content

**Migration File**: `supabase/migrations/20250109_add_metoken_fields_to_video_assets.sql`

### 2. Type Definitions
Updated `VideoAsset` interface in `lib/types/video-asset.ts`:
```typescript
export interface VideoAsset {
  // ... existing fields
  requires_metoken: boolean;
  metoken_price: number | null;
}
```

### 3. Upload Flow Components

#### CreateThumbnailForm (`components/Videos/Upload/CreateThumbnailForm.tsx`)
- **MeToken Detection**: Automatically checks if the user has a MeToken on component mount
- **MeToken Status Display**: Shows alert indicating whether user has a MeToken or not
- **MeToken Creation**: Provides inline MeToken creation flow if user doesn't have one
- **Access Control Configuration**: 
  - Toggle to enable/disable MeToken requirement
  - Input field for minimum MeToken balance required
  - Displays MeToken symbol for clarity

#### Create-thumbnail (`components/Videos/Upload/Create-thumbnail.tsx`)
- Updated to handle `meTokenConfig` state and pass it through to parent component

#### Main Upload Flow (`components/Videos/Upload/index.tsx`)
- Saves MeToken configuration to database when publishing video
- Includes `requires_metoken` and `metoken_price` in video asset creation and updates

### 4. Mobile Navigation Improvements
Enhanced all navigation buttons across upload steps for better mobile UX:
- Added `touch-manipulation` CSS class for better touch response
- Increased minimum button width to 120px for easier tapping
- Made buttons full-width on mobile, auto-width on desktop
- Added proper tap highlight removal for iOS devices
- Improved button spacing and visual feedback

**Files Updated**:
- `components/Videos/Upload/FileUpload.tsx`
- `components/Videos/Upload/Create-info.tsx`
- `components/Videos/Upload/Create-thumbnail.tsx`

### 5. Backend Services
Updated `services/video-assets.ts`:
- `createVideoAsset()`: Now accepts and stores `requires_metoken` and `metoken_price`
- `updateVideoAsset()`: Now updates MeToken fields when provided

## User Flow

### For Creators With MeToken
1. Upload video and fill in details (Step 1)
2. Upload video file (Step 2)
3. Generate thumbnail (Step 3)
4. See "MeToken Active" status with their MeToken name and symbol
5. Toggle "Require MeToken for Access"
6. Set minimum MeToken balance required
7. Optionally configure NFT minting
8. Publish content

### For Creators Without MeToken
1. Upload video and fill in details (Step 1)
2. Upload video file (Step 2)
3. Generate thumbnail (Step 3)
4. See "No MeToken Found" alert
5. Click "Create MeToken" button
6. Fill in MeToken details (name, symbol, initial deposit)
7. Complete MeToken creation transaction
8. Return to upload flow with MeToken now active
9. Configure access control as above
10. Publish content

## Mobile Responsiveness

All buttons and interactive elements now include:
- Full-width layout on mobile devices
- Minimum touch target size of 44x44 pixels (120px minimum width)
- Proper spacing between buttons (12px gap)
- Touch-optimized feedback (no tap highlight color on iOS)
- Responsive text sizing (text-sm on mobile, text-base on desktop)

## Database Migration

Run the migration to add the new fields:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the migration SQL file
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20250109_add_metoken_fields_to_video_assets.sql
```

## Future Enhancements

1. **Video Player Integration**: Implement MeToken balance checking in the video player before allowing playback
2. **Subscription Checking**: Add real-time subscription status checking using the MeToken balance
3. **Dynamic Pricing**: Allow creators to update MeToken requirements for existing videos
4. **Analytics**: Track views/access attempts by MeToken holders vs non-holders
5. **Batch Operations**: Allow creators to set MeToken requirements for multiple videos at once

## Testing Checklist

- [ ] User can create MeToken during upload flow
- [ ] User with existing MeToken sees correct status
- [ ] MeToken requirement toggle works correctly
- [ ] Minimum balance input accepts decimal values
- [ ] Video publishes with correct MeToken fields in database
- [ ] Mobile navigation works smoothly on iOS devices
- [ ] Mobile navigation works smoothly on Android devices
- [ ] Buttons are easily tappable on small screens
- [ ] Form validation prevents invalid inputs
- [ ] Error messages display correctly

## Related Files

- `components/Videos/Upload/CreateThumbnailForm.tsx`
- `components/Videos/Upload/Create-thumbnail.tsx`
- `components/Videos/Upload/index.tsx`
- `components/Videos/Upload/FileUpload.tsx`
- `components/Videos/Upload/Create-info.tsx`
- `lib/types/video-asset.ts`
- `services/video-assets.ts`
- `supabase/migrations/20250109_add_metoken_fields_to_video_assets.sql`

