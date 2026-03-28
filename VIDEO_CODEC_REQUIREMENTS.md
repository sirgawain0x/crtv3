# Video Codec Requirements & Troubleshooting

## Overview
This document explains the video format requirements for uploading videos to the platform and how to troubleshoot transcoding errors.

## The Problem
Users were encountering transcoding failures with the error:
```text
invalid video file codec or container, check your input file against the input codec and container support matrix
```

This occurs when a video file has a supported extension (like `.mp4`) but uses an incompatible codec that Livepeer's transcoding service cannot process.

## Supported Video Formats

### ✅ Required Specifications

| Component | Supported Options |
|-----------|------------------|
| **Video Codecs** | H.264 (AVC), H.265 (HEVC) |
| **Containers** | MP4, MOV, MKV, WebM, FLV, TS |
| **Max File Size** | 5GB |
| **Recommended** | MP4 container with H.264 codec |

### ❌ Common Incompatible Formats
- **MPEG-2** - Older codec, not supported
- **WMV** (Windows Media Video) - Proprietary format
- **ProRes** - Professional codec, too large for web
- **AVI with DivX/Xvid** - Legacy codecs
- **MOV with Animation codec** - Not web-compatible

## How to Check Your Video's Codec

### Using VLC Media Player (Free)
1. Open your video in VLC
2. Go to **Tools → Codec Information** (or `Ctrl+J`)
3. Look at the **Codec** field under the Video section
4. Verify it shows `H264` or `H265`

### Using Command Line (FFmpeg)
```bash
ffmpeg -i your-video.mp4
```
Look for the line starting with `Video:` - it should show `h264` or `hevc`

### Using MediaInfo (Free)
1. Download MediaInfo from https://mediaarea.net/en/MediaInfo
2. Open your video file
3. Check the **Format** and **Codec ID** fields

## Converting Videos to Supported Format

### Option 1: HandBrake (Recommended for Beginners)
HandBrake is a free, open-source video converter with an easy-to-use interface.

**Steps:**
1. Download from https://handbrake.fr/
2. Open your video file
3. Select the **"Fast 1080p30"** preset
4. Ensure **Video Codec** is set to **H.264 (x264)**
5. Click **Start Encode**

**Recommended Settings:**
- **Preset:** Fast 1080p30 (or Fast 720p30 for smaller files)
- **Video Codec:** H.264 (x264)
- **Format:** MP4
- **Framerate:** Same as source
- **Quality:** RF 20-23 (lower = better quality but larger file)

### Option 2: FFmpeg (For Advanced Users)
FFmpeg is a powerful command-line tool for video conversion.

**Basic Conversion:**
```bash
ffmpeg -i input-video.mov -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k output-video.mp4
```

**Explanation:**
- `-c:v libx264` - Use H.264 codec
- `-preset fast` - Encoding speed (fast, medium, slow)
- `-crf 23` - Quality (18-28, lower = better)
- `-c:a aac` - Audio codec
- `-b:a 128k` - Audio bitrate

**For 4K/High Quality:**
```bash
ffmpeg -i input.mov -c:v libx264 -preset slow -crf 20 -vf scale=1920:1080 -c:a aac -b:a 192k output.mp4
```

**For Small File Size:**
```bash
ffmpeg -i input.mov -c:v libx264 -preset fast -crf 28 -vf scale=1280:720 -c:a aac -b:a 96k output.mp4
```

### Option 3: Online Converters
- **CloudConvert** - https://cloudconvert.com/
- **Zamzar** - https://www.zamzar.com/
- **FreeConvert** - https://www.freeconvert.com/

**Note:** Be cautious with sensitive content on online converters.

## Improvements Made to Handle This Error

### 1. Enhanced Error Detection (`Create-thumbnail.tsx`)
```tsx
if (data?.status?.phase === "failed") {
  const errorMsg = data.status.errorMessage || "Unknown error";
  const isCodecError = errorMsg.toLowerCase().includes('codec') || 
                       errorMsg.toLowerCase().includes('container');
  
  if (isCodecError) {
    toast.error(
      "Video format not supported",
      { 
        description: "Your video file uses an unsupported codec. Please convert it to H.264 or H.265 codec in an MP4 container."
      }
    );
  }
}
```

### 2. Improved Upload Page Guidance (`FileUpload.tsx`)
Added clear warning on the upload page:
```
⚠️ Important: Your video must use H.264 or H.265 codec. 
If upload fails, convert your video using HandBrake or FFmpeg.
```

### 3. Detailed Error UI
When transcoding fails, users now see:
- The exact error message
- Step-by-step conversion instructions
- Links to recommended tools
- A "Go Back" button to retry with a different file

## Best Practices for Content Creators

### 1. Export Settings from Video Editors

**Adobe Premiere Pro:**
- Format: H.264
- Preset: YouTube 1080p Full HD
- Target Bitrate: 8-10 Mbps

**Final Cut Pro:**
- Format: Computer
- Video Codec: H.264 (Better Quality)
- Resolution: 1920x1080

**DaVinci Resolve:**
- Format: MP4
- Codec: H.264
- Quality: Automatic (or ~8 Mbps)

### 2. Phone Video Uploads
Modern smartphones (iPhone, Android) record in H.264 by default, so no conversion is needed. However:
- **iPhone:** Disable "High Efficiency" mode if it's using HEVC (H.265) and causing issues
- **Android:** Most phones use H.264 by default

### 3. Screen Recordings
- **OBS Studio:** Set to H.264 codec in settings
- **QuickTime (Mac):** Records in H.264 by default
- **Windows Game Bar:** Records in H.264 by default

## Troubleshooting Checklist

If your upload fails, check:

- [ ] Video codec is H.264 or H.265
- [ ] Container format is MP4 (preferred) or MOV
- [ ] File size is under 5GB
- [ ] Video is not corrupted (plays in VLC)
- [ ] Video has valid dimensions (not 0x0 or invalid)
- [ ] Video has valid duration (not 0 seconds)

## Technical Details

### Livepeer Transcoding Pipeline
1. **Upload:** Video uploaded via TUS protocol
2. **Storage:** Stored in IPFS
3. **Transcoding:** Livepeer converts to multiple resolutions
4. **Output:** HLS/DASH adaptive streaming formats

### Why These Codecs?
- **H.264 (AVC):** Universal browser support, good compression
- **H.265 (HEVC):** Better compression but less browser support
- **Web compatibility:** These codecs work in all modern browsers

## Error Reference

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `invalid video file codec or container` | Unsupported codec | Convert to H.264 MP4 |
| `File size exceeds limit` | File > 5GB | Compress or reduce quality |
| `No video stream found` | Corrupted file | Re-export from source |
| `Invalid dimensions` | Video has 0x0 size | Check source file |

## Resources

- **HandBrake:** https://handbrake.fr/ (Free, GUI-based)
- **FFmpeg:** https://ffmpeg.org/ (Free, command-line)
- **VLC Player:** https://www.videolan.org/ (Free, for checking codecs)
- **MediaInfo:** https://mediaarea.net/en/MediaInfo (Free, codec details)
- **Livepeer Docs:** https://docs.livepeer.org/

## Support

If you continue to experience issues after converting your video:
1. Check the browser console for detailed error logs
2. Verify your video plays correctly in VLC
3. Try uploading a different video to isolate the issue
4. Contact support with the asset ID and error message

## Files Modified
- `components/Videos/Upload/Create-thumbnail.tsx` - Enhanced error detection and user guidance
- `components/Videos/Upload/FileUpload.tsx` - Added codec warnings and requirements

## Date
January 10, 2025

