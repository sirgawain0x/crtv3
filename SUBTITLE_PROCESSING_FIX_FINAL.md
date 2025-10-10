# Subtitle Processing Error - Final Fix

## Issue
Users were experiencing a `500 Internal Server Error` with the message `{"errors":["Internal server error: FetchError"]}` when trying to generate subtitles from video audio.

### Error Details
```
API request failed: 500 Internal Server Error - {"errors":["Internal server error: FetchError"]}
    at getLivepeerAudioToText (app/api/livepeer/audioToText.ts:165:11)
```

## Root Cause Analysis

After consulting the official Livepeer documentation (https://docs.livepeer.org/ai/pipelines/audio-to-text), we identified multiple issues:

### Issues Identified
1. **Missing Required `model_id` Parameter**: Livepeer's audio-to-text API requires the `model_id` parameter (e.g., `openai/whisper-large-v3`)
2. **URL Reference Instead of File**: The API expects the actual file data to be uploaded, not a URL reference
3. **No File Size Validation**: Livepeer has a strict 50MB file size limit that wasn't being checked
4. **Incorrect API Usage**: We weren't following the official Livepeer API specification

## Official Livepeer API Specification

According to Livepeer's documentation, the audio-to-text API expects:

```bash
curl -X POST "https://livepeer.studio/api/beta/generate/audio-to-text" \
    -F model_id=openai/whisper-large-v3 \
    -F audio=@<PATH_TO_FILE>
```

**Requirements:**
- **Form Field `audio`**: The actual audio/video file (not a URL)
- **Form Field `model_id`**: The transcription model to use (default: `openai/whisper-large-v3`)
- **File Formats**: `mp4`, `webm`, `mp3`, `flac`, `wav`, `m4a`
- **Max File Size**: 50 MB
- **Response**: JSON with `chunks` array containing text and timestamps

## Solution Implemented

### 1. **Download Video File First**
Instead of passing a URL, we now download the video file from Livepeer's CDN:

```typescript
const videoResponse = await fetch(mediaUrl);
if (!videoResponse.ok) {
  throw new Error(`Failed to download video: ${videoResponse.status}`);
}
const videoBlob = await videoResponse.blob();
```

### 2. **Validate File Size**
Check against Livepeer's 50MB limit before processing:

```typescript
const maxSize = 50 * 1024 * 1024; // 50 MB in bytes
if (videoBlob.size > maxSize) {
  throw new Error(
    `Video file is too large (${(videoBlob.size / 1024 / 1024).toFixed(2)}MB). ` +
    `Maximum size for audio-to-text processing is 50MB.`
  );
}
```

### 3. **Include Required `model_id` Parameter**
Add the model_id to FormData as required by the API:

```typescript
formData = new FormData();
formData.append('audio', videoBlob, `${assetId}.mp4`);
formData.append('model_id', params.modelId || 'openai/whisper-large-v3');
```

### 4. **Enhanced Error Messages**
Provide specific, actionable error messages for different failure scenarios:

```typescript
if (videoBlob.size > maxSize) {
  throw new Error(
    `Video file is too large (${(videoBlob.size / 1024 / 1024).toFixed(2)}MB). ` +
    `Maximum size for audio-to-text processing is 50MB. Please use a shorter video or lower resolution.`
  );
}
```

## Changes Made

### File: `/app/api/livepeer/audioToText.ts`

**Before:**
```typescript
// Just passing URL (WRONG)
formData = new FormData();
formData.append('audio', mediaUrl);
```

**After:**
```typescript
// Download file, validate size, add required parameters (CORRECT)
const videoResponse = await fetch(mediaUrl);
if (!videoResponse.ok) {
  throw new Error(`Failed to download video: ${videoResponse.status}`);
}

const videoBlob = await videoResponse.blob();
console.log('Downloaded video blob:', videoBlob.size, 'bytes');

// Check file size (Livepeer has a 50MB limit)
const maxSize = 50 * 1024 * 1024;
if (videoBlob.size > maxSize) {
  throw new Error(
    `Video file is too large (${(videoBlob.size / 1024 / 1024).toFixed(2)}MB). ` +
    `Maximum size for audio-to-text processing is 50MB.`
  );
}

// Create FormData with the actual file and model_id
formData = new FormData();
formData.append('audio', videoBlob, `${assetId}.mp4`);
formData.append('model_id', params.modelId || 'openai/whisper-large-v3');
```

**Additional Changes:**
- Increased timeout from 60 seconds to 5 minutes to accommodate video downloads
- Added file size validation for direct file uploads
- Enhanced error logging with structured data
- Better error messages for users

### File: `/components/Videos/Upload/CreateThumbnailForm.tsx`

**User-Friendly Error Messages:**
```typescript
if (error instanceof Error) {
  if (error.message.includes("not ready for processing")) {
    errorMessage = "Video is still processing. Please wait a few moments and try again.";
  } else if (error.message.includes("too large")) {
    errorMessage = error.message; // Shows exact file size
  } else if (error.message.includes("Could not download")) {
    errorMessage = "Failed to access video file. Please ensure the video has finished uploading.";
  } else if (error.message.includes("timeout")) {
    errorMessage = "Processing timed out. The video may be too long. Try again or contact support.";
  }
}
```

**Enhanced Progress Notifications:**
```typescript
toast.info("Downloading and processing video for subtitle generation...", { 
  duration: 5000,
  description: "This may take a few minutes depending on video length"
});
```

## API Parameters

The function now supports both string (asset ID) and object parameters:

```typescript
// Simple usage with asset ID
await getLivepeerAudioToText(assetId);

// Advanced usage with custom model
await getLivepeerAudioToText({
  assetId: assetId,
  modelId: 'openai/whisper-large-v3' // optional, defaults to whisper-large-v3
});

// Direct file upload
await getLivepeerAudioToText({
  formData: formDataWithFile,
  modelId: 'openai/whisper-large-v3' // optional
});
```

## Expected API Response

The Livepeer API returns:

```json
{
  "chunks": [
    {
      "text": " Explore the power of automatic speech recognition",
      "timestamp": [0, 1.35]
    },
    {
      "text": " By extracting the text from audio",
      "timestamp": [1.35, 2.07]
    }
  ],
  "text": " Explore the power of automatic speech recognition By extracting the text from audio"
}
```

## File Size Limitations

**Important:** Livepeer's audio-to-text API has a strict **50MB file size limit**.

For videos larger than 50MB, consider:
1. **Lower Resolution**: Re-encode at a lower bitrate
2. **Shorter Clips**: Split long videos into shorter segments
3. **Compression**: Use more aggressive compression settings
4. **Audio-Only**: Extract just the audio track if possible

## Testing Recommendations

1. **Test with various file sizes:**
   - Small videos (< 10MB) - should work instantly
   - Medium videos (10-40MB) - should complete within timeout
   - Large videos (40-50MB) - test timeout handling
   - Oversized videos (> 50MB) - should show clear error message

2. **Test error scenarios:**
   - Video still processing (not ready)
   - Invalid asset ID
   - Network interruption during download
   - API timeout

3. **Monitor performance:**
   - Check download times in logs
   - Verify timeout is sufficient
   - Monitor memory usage for large files

## Debugging

Enable detailed logging by checking the console for:

```
Downloading asset for audio-to-text processing
Media URL: https://...
Downloaded video blob: 12345678 bytes
```

If you see errors, check:
1. **File size**: Is it under 50MB?
2. **Asset status**: Is the video fully processed (`phase: "ready"`)?
3. **Network**: Can you access the media URL directly?
4. **API Key**: Is `LIVEPEER_FULL_API_KEY` set correctly?

## Related Documentation

- [Livepeer Audio-to-Text Official Docs](https://docs.livepeer.org/ai/pipelines/audio-to-text)
- [Livepeer AI Gateway Configuration](https://docs.livepeer.org/ai/orchestrators/get-started)
- [OpenAI Whisper Model](https://openai.com/research/whisper)

## Related Files
- `/app/api/livepeer/audioToText.ts` - Main audio-to-text processing logic
- `/components/Videos/Upload/CreateThumbnailForm.tsx` - UI component for subtitle generation
- `/services/video-assets.ts` - Video asset management service
- `/lib/types/video-asset.ts` - TypeScript types for video assets

## Summary

This fix aligns our implementation with Livepeer's official API specification by:
✅ Downloading the video file instead of passing URLs
✅ Adding the required `model_id` parameter
✅ Validating file sizes against the 50MB limit
✅ Providing clear, actionable error messages
✅ Following best practices from Livepeer documentation

The solution is robust, user-friendly, and follows industry standards for API integration.

