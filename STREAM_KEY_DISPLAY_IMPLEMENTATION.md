# Stream Key Display Implementation

## Overview
Implemented display of stream key and RTMP server URL in the Settings popover so livestreamers can easily access their credentials for OBS Studio or other broadcasting software.

## Changes Made

### 1. Updated Settings Component (`components/Live/Broadcast.tsx`)

**Added Props**:
- `streamKey?: string | null` - The stream key from Livepeer
- `ingestUrl?: string | null` - The full RTMP ingest URL

**New Features**:
- **Stream Info Section**: Added a new section at the top of the Settings popover
- **RTMP Server URL Display**: Shows the base RTMP server URL (without stream key)
- **Stream Key Display**: Shows the stream key
- **Copy Buttons**: Each field has a copy button for easy copying
- **Click-to-Select**: Input fields are read-only but selectable on click
- **User Instructions**: Added helpful text explaining these are for OBS Studio

### 2. Updated Settings Component Call

**Location**: `components/Live/Broadcast.tsx:292-300`

Now passes `streamKey` and `ingestUrl` to the Settings component:
```typescript
<Settings
  streamId={streamData?.id || ""}
  streamKey={streamKey}
  ingestUrl={ingestUrl}
>
```

### 3. UI Improvements

- **Wider Popover**: Increased width from `w-72` to `w-96` to accommodate longer URLs
- **Responsive**: Added `max-w-[90vw]` for mobile compatibility
- **Styled Inputs**: Read-only inputs with monospace font for better readability
- **Copy Icons**: Added CopyIcon from lucide-react
- **Toast Notifications**: Success/error toasts when copying

## User Experience

### Where Users Find Stream Key

1. **Click the Settings icon** (gear icon) in the broadcast controls
2. **See "Stream Info (for OBS)" section** at the top of the popover
3. **View RTMP Server URL and Stream Key** in separate fields
4. **Click copy buttons** or click the input fields to select and copy manually

### What Users See

```
Stream Info (for OBS)
├── RTMP Server URL: [rtmp://ingest.livepeer.studio/live/] [Copy]
└── Stream Key: [abc123xyz...] [Copy]

Use these credentials in OBS Studio or other broadcasting software
```

## Technical Details

### RTMP URL Extraction

The code extracts the base RTMP URL from the full ingest URL:
- Full URL format: `rtmp://ingest.livepeer.studio/live/{streamKey}`
- Base URL extracted: `rtmp://ingest.livepeer.studio/live/`
- Handles both formats: from `streamData.ingest.rtmp.url` or `getIngest(streamKey)`

### Copy Functionality

Uses the Clipboard API with error handling:
```typescript
const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  } catch (err) {
    toast.error("Failed to copy to clipboard");
  }
};
```

## Files Modified

1. `components/Live/Broadcast.tsx`
   - Added CopyIcon import
   - Updated Settings component props
   - Added Stream Info section to Settings popover
   - Added copy functionality
   - Increased popover width

## Testing Checklist

- [ ] Stream key displays correctly after stream creation
- [ ] RTMP server URL displays correctly
- [ ] Copy buttons work for both fields
- [ ] Toast notifications appear on copy
- [ ] Input fields are selectable
- [ ] Popover width is appropriate on different screen sizes
- [ ] Section only shows when streamKey and ingestUrl are available
- [ ] Works with both ingest URL formats (from streamData or getIngest)

## Future Enhancements

Potential improvements:
1. Add "Show/Hide" toggle for stream key (security)
2. Add QR code for mobile OBS apps
3. Add direct OBS configuration file download
4. Add instructions for common broadcasting software
5. Add test connection button

## Summary

Livestreamers can now easily find their stream key and RTMP server URL by:
1. Opening the Settings popover (gear icon)
2. Viewing the "Stream Info (for OBS)" section
3. Copying the credentials with one click

This solves the previous issue where stream credentials were not visible to users.

