# Video Transcoding Troubleshooting Guide

## Quick Diagnostics

### Step 1: Check Browser Console
1. Open Developer Tools (F12 or Cmd+Opt+I)
2. Go to Console tab
3. Upload a video and watch for logs
4. Look for "Livepeer asset status:" messages

### Step 2: Identify the Error Phase

#### Upload Phase (Step 2)
**Symptoms**: Progress bar stuck, upload fails
**Check**:
```javascript
// Console should show:
"Start upload - using smart account address: 0x..."
"Upload completed"
```

**Common Issues**:
- Network timeout
- File too large (>10GB)
- Invalid API key

#### Transcoding Phase (Step 3)
**Symptoms**: Status shows "processing" then "failed"
**Check**:
```javascript
// Console shows:
Livepeer asset status: {
  phase: "failed",
  errorMessage: "..." // THIS is the key info
}
```

**Common Issues**:
- Unsupported codec
- Corrupted video file
- Invalid video format

## Common Error Messages & Solutions

### Error: "Unsupported codec"
**Solution**:
```bash
# Re-encode your video with H.264
ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
```

### Error: "File format not supported"
**Supported Formats**:
- ✅ MP4 (H.264, H.265)
- ✅ MOV (H.264)
- ✅ WebM (VP8, VP9)
- ✅ MKV
- ❌ AVI (old codecs)
- ❌ WMV
- ❌ FLV (old Flash)

### Error: "Asset processing timeout"
**Solution**:
- File might be too large or complex
- Try reducing file size:
```bash
# Compress video
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -c:a aac output.mp4
```

### Error: "Invalid API key" or 401/403
**Solution**:
```bash
# Check .env.local
LIVEPEER_FULL_API_KEY=xxxxx

# Get new key from: https://livepeer.studio
```

## Video File Requirements

### Recommended Specs
- **Container**: MP4
- **Video Codec**: H.264 (most compatible) or H.265
- **Audio Codec**: AAC
- **Resolution**: Up to 4K (3840x2160)
- **Frame Rate**: 24-60 fps
- **Bitrate**: 5-20 Mbps for HD
- **Max File Size**: 10GB

### How to Check Your Video Codec
**On Mac**:
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 video.mp4
```

**On Windows** (using VLC):
1. Tools → Media Information
2. Check "Codec Details"

## Testing with Sample Video

Try uploading this known-good test video:
1. Go to: https://sample-videos.com/
2. Download: "sample-5s.mp4" (H.264, small file)
3. Upload to your app
4. If this works → Your original video has issues
5. If this fails → API/configuration issue

## Livepeer Dashboard Check

1. Go to: https://livepeer.studio
2. Login to your account
3. Navigate to "Assets"
4. Find your failed video
5. Check the error details there

## Advanced Debugging

### Enable Full Logging
Add to your upload code:
```typescript
console.log('Upload starting...', {
  fileName: selectedFile.name,
  fileSize: selectedFile.size,
  fileType: selectedFile.type,
});
```

### Check Asset Creation
```typescript
// In assetUploadActions.ts, log the creation:
const result = await fullLivepeer.asset.create(createAssetBody);
console.log('Asset created:', result.data);
```

### Monitor Network Tab
1. Open DevTools → Network tab
2. Filter: "livepeer.studio"
3. Watch for failed requests (red)
4. Check response body for errors

## Still Having Issues?

If none of the above helps, please provide:

1. **Video Details**:
   - File name
   - File size
   - Format/codec (from ffprobe)
   - Duration

2. **Console Logs**:
   - Full "Livepeer asset status" output
   - Any error messages
   - Network tab responses

3. **Upload Steps**:
   - Does upload complete (Step 2)?
   - Does transcoding start (Step 3)?
   - At what % does it fail?

4. **Environment**:
   - Browser (Chrome, Safari, Firefox?)
   - Operating System
   - Are you using local dev or production?

## Quick Test Script

Run this to verify your video is valid:
```bash
#!/bin/bash
VIDEO_FILE="your-video.mp4"

echo "Checking video codec..."
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE"

echo "Checking audio codec..."
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE"

echo "Checking duration..."
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE"

echo "Checking file size..."
ls -lh "$VIDEO_FILE"
```

## Contact Support

If you're still stuck:
- Livepeer Discord: https://discord.gg/livepeer
- Livepeer Support: support@livepeer.org
- Include your asset ID from console logs

