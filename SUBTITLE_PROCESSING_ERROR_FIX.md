# Subtitle Processing Error Fix

## Issue
Users were experiencing a `500 Internal Server Error` with the message `{"errors":["Internal server error: FetchError"]}` when trying to generate subtitles from video audio.

### Error Details
```
API request failed: 500 Internal Server Error - {"errors":["Internal server error: FetchError"]}
    at getLivepeerAudioToText (app/api/livepeer/audioToText.ts:165:11)
```

## Root Cause
The error occurred because we were passing a media URL to Livepeer's audio-to-text API, but Livepeer's servers were unable to fetch the video from that URL. This happened for several reasons:

1. **URL Format Issues**: The constructed URL format may not have been accessible to Livepeer's servers
2. **Network Access**: Livepeer's audio-to-text service couldn't reach the URL we were providing
3. **Authentication**: The URL might have required authentication that wasn't being passed through

## Solution
Instead of passing a URL to Livepeer's API, we now:

1. **Download the video file first** from the Livepeer CDN
2. **Convert it to a Blob**
3. **Send the actual file data** to the audio-to-text API via FormData

This approach is more reliable because:
- We control the download process and can handle errors gracefully
- We send the actual file data rather than a URL reference
- We can provide better error messages to users

## Changes Made

### 1. `/app/api/livepeer/audioToText.ts`

#### URL Construction Improvements
- Simplified URL selection logic to prioritize `downloadUrl` and `playbackUrl`
- Removed complex fallback URL construction that might produce inaccessible URLs
- Added better logging to track which URL source is being used

#### File Download Implementation
```typescript
// Download the video file first, then send it to the API
const videoResponse = await fetch(mediaUrl);
if (!videoResponse.ok) {
  throw new Error(`Failed to download video: ${videoResponse.status}`);
}
const videoBlob = await videoResponse.blob();

// Create FormData with the actual file
formData = new FormData();
formData.append('audio', videoBlob, `${assetId}.mp4`);
```

#### Timeout Increase
- Increased timeout from 60 seconds to 5 minutes (300,000ms)
- This accommodates both video download time and processing time
- Updated error message to reflect new timeout duration

#### Enhanced Error Handling
- Added specific error handling for download failures
- Improved error messages to guide users on what went wrong
- Added logging at key points to help with debugging

### 2. `/components/Videos/Upload/CreateThumbnailForm.tsx`

#### User-Friendly Error Messages
Added context-specific error messages:
- Video not ready: "Video is still processing. Please wait a few moments and try again."
- Download failure: "Failed to access video file. Please ensure the video has finished uploading and processing."
- Timeout: "Processing timed out. The video may be too long. Try again or contact support."

#### Improved User Feedback
- Added more descriptive toast messages during processing
- Included duration estimates in notifications
- Added fallback message: "You can still publish your video without subtitles"

#### Better Progress Indication
```typescript
toast.info("Downloading and processing video for subtitle generation...", { 
  duration: 5000,
  description: "This may take a few minutes depending on video length"
});
```

## Testing Recommendations

1. **Test with various video sizes**:
   - Small videos (< 10MB)
   - Medium videos (10-100MB)
   - Large videos (> 100MB)

2. **Test timing scenarios**:
   - Process subtitles immediately after upload
   - Wait for video to be fully ready
   - Test timeout behavior with very large files

3. **Test error handling**:
   - Network interruptions during download
   - Invalid asset IDs
   - Videos that aren't ready yet

4. **Monitor performance**:
   - Check server logs for download times
   - Monitor memory usage for large video files
   - Verify timeout is sufficient for largest expected videos

## Future Improvements

1. **Streaming Processing**: For very large files, consider streaming the video data rather than loading it entirely into memory

2. **Progress Indicators**: Show download progress to users for large files

3. **Smart Timeout**: Calculate timeout based on video file size

4. **Caching**: Cache processed subtitles to avoid reprocessing

5. **Chunked Processing**: Process very long videos in chunks to avoid timeouts

## Related Files
- `/app/api/livepeer/audioToText.ts` - Main audio-to-text processing logic
- `/components/Videos/Upload/CreateThumbnailForm.tsx` - UI component for subtitle generation
- `/services/video-assets.ts` - Video asset management service

## Additional Notes
- This fix follows Alchemy best practices for retrying failed requests
- Error handling provides users with actionable feedback
- The solution is backward compatible with existing code that uses this API

