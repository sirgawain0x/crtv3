# Video Upload Quick Guide

## ✅ Supported Video Formats

### Best Format (Recommended)
- **Container**: MP4
- **Video Codec**: H.264 (AVC)
- **Audio Codec**: AAC
- **Max File Size**: 5GB

### Also Supported
| Container | Extension | Notes |
|-----------|-----------|-------|
| MP4 | `.mp4` | ✅ Most compatible |
| MOV | `.mov` | ✅ Apple format |
| MKV | `.mkv` | ✅ High quality |
| WebM | `.webm` | ✅ Web optimized |
| FLV | `.flv` | ⚠️ Legacy format |
| TS | `.ts` | ⚠️ Transport stream |
| MPEG | `.mpeg`, `.mpg` | ⚠️ Legacy format |

## ❌ Unsupported Formats

These formats will be **rejected**:
- AVI (`.avi`)
- WMV (`.wmv`)
- 3GP (`.3gp`)
- VOB (`.vob`)
- ASF (`.asf`)
- Any proprietary formats

## 🔧 How to Convert Your Video

### Option 1: Use FFmpeg (Command Line)

**Install FFmpeg:**
- macOS: `brew install ffmpeg`
- Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- Linux: `sudo apt-get install ffmpeg`

**Convert to MP4:**
```bash
ffmpeg -i your-video.avi -c:v libx264 -c:a aac -movflags +faststart output.mp4
```

**Quick conversion (fast, good quality):**
```bash
ffmpeg -i input.* -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k output.mp4
```

### Option 2: Use Online Tools
- [CloudConvert](https://cloudconvert.com/video-converter)
- [FreeConvert](https://www.freeconvert.com/video-converter)
- [Online-Convert](https://video.online-convert.com/)

### Option 3: Use Desktop Software
- **Handbrake** (Free, Windows/Mac/Linux)
- **VLC Media Player** (Free, can convert videos)
- **Adobe Media Encoder** (Professional)

## 🎬 Optimal Settings for Upload

### For Best Quality
```
Container: MP4
Video Codec: H.264
Frame Rate: 24-60 fps
Resolution: Up to 4K (3840x2160)
Video Bitrate: 5-15 Mbps (1080p), 15-30 Mbps (4K)
Audio Codec: AAC
Audio Bitrate: 192-256 kbps
Sample Rate: 48 kHz
```

### For Smaller File Size
```
Container: MP4
Video Codec: H.264
Frame Rate: 24-30 fps
Resolution: 1080p (1920x1080) or 720p (1280x720)
Video Bitrate: 2-5 Mbps (1080p), 1-3 Mbps (720p)
Audio Codec: AAC
Audio Bitrate: 128 kbps
Sample Rate: 44.1 kHz
```

## 🐛 Troubleshooting

### "Invalid video file codec or container"
**Solution**: Your video format is not supported. Convert to MP4 with H.264 codec.

### "File size exceeds 5GB limit"
**Solutions**:
1. Compress the video using FFmpeg:
   ```bash
   ffmpeg -i large-video.mp4 -c:v libx264 -crf 28 -c:a aac compressed.mp4
   ```
2. Reduce resolution from 4K to 1080p
3. Lower the bitrate
4. Split the video into multiple parts

### Upload fails or times out
**Solutions**:
1. Check your internet connection
2. Try a smaller test file first
3. Ensure the video is not corrupted
4. Try converting to MP4 format first

### Video plays but has no audio
**Solution**: Ensure your audio codec is AAC. Convert using:
```bash
ffmpeg -i input.mp4 -c:v copy -c:a aac output.mp4
```

### Video is too large to upload
**Compression options (in order of quality loss)**:
1. Lower bitrate: `-b:v 3M` (3 Mbps)
2. Increase compression: `-crf 28` (higher = smaller file, lower quality)
3. Reduce resolution: `-s 1280x720` or `-s 1920x1080`
4. Lower frame rate: `-r 24` or `-r 30`

## 📝 Validation Messages

The upload form will now show these messages:

### ✅ Success Messages
- "✓ Sufficient DAI balance" (if applicable)
- "Video uploaded and published successfully!"

### ⚠️ Warning Messages
- "Unsupported video format: .avi. Please use MP4, MOV, MKV, WebM, FLV, or TS format with H.264/H.265 codec."
- "File size exceeds 5GB limit. Please compress your video or use a smaller file."

### ℹ️ Info Messages
- "Supported formats: MP4, MOV, MKV, WebM, FLV, TS (H.264/H.265 codec recommended). Max size: 5GB"

## 🔍 Check Your Video Format

### Using FFprobe (comes with FFmpeg)
```bash
ffprobe -v error -show_entries stream=codec_name,codec_type -of default=noprint_wrappers=1 your-video.mp4
```

**Example output:**
```
codec_name=h264
codec_type=video
codec_name=aac
codec_type=audio
```

### Using VLC Media Player
1. Open video in VLC
2. Go to Tools → Codec Information
3. Check "Codec" field for video and audio

### Using Online Tools
- [VideoInspector.io](https://videoinspector.io/)
- Upload your video and see detailed codec information

## 💡 Pro Tips

1. **Always use "fast start" flag**: This enables progressive loading
   ```bash
   ffmpeg -i input.mp4 -movflags +faststart output.mp4
   ```

2. **Test with a small clip first**: Before uploading a large file, test with a 10-second clip

3. **Keep original files**: Always keep your original video files as backup

4. **Batch convert**: If you have many videos, create a script to convert them all at once

5. **Use hardware acceleration**: Speed up encoding with GPU acceleration
   ```bash
   # For NVIDIA GPUs
   ffmpeg -hwaccel cuda -i input.mp4 -c:v h264_nvenc output.mp4
   ```

## 📚 Additional Resources

- [Livepeer Docs](https://docs.livepeer.org/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [H.264 Settings Guide](https://trac.ffmpeg.org/wiki/Encode/H.264)
- [Web Video Best Practices](https://developer.mozilla.org/en-US/docs/Web/Media/Formats)

