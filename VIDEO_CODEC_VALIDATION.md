# Video Codec and Container Validation

## Problem

Users were encountering the following error when uploading videos to Livepeer:
```
Video transcoding failed: invalid video file codec or container, check your input file against the input codec and container support matrix
```

This error occurs when attempting to upload video files that don't meet Livepeer's codec and container requirements.

## Root Cause

The video upload component was accepting any `video/*` file type without validating whether the file format was supported by Livepeer's transcoding service. This meant users could select and attempt to upload unsupported formats, leading to transcoding failures.

## Livepeer's Supported Formats

### Supported Containers
- MP4 (`.mp4`)
- MOV (`.mov`) 
- MKV (`.mkv`)
- WebM (`.webm`)
- FLV (`.flv`)
- TS (`.ts`)
- MPEG (`.mpeg`, `.mpg`)

### Supported Video Codecs
- H.264 (AVC)
- H.265 (HEVC)
- VP8
- VP9
- AV1

### Supported Audio Codecs
- AAC
- MP3
- Opus

**Recommendation**: For best compatibility, use MP4 containers with H.264 video codec and AAC audio codec.

## Solution Implemented

### 1. File Validation Function

Added a `validateVideoFile()` function that checks:
- File extension against supported formats
- MIME type against supported video types
- File size (5GB maximum)

```typescript
const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
  // Check file extension
  const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  const isValidExtension = SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension);
  
  // Check MIME type
  const isValidMimeType = SUPPORTED_VIDEO_FORMATS.includes(file.type);
  
  if (!isValidExtension && !isValidMimeType) {
    return {
      valid: false,
      error: `Unsupported video format: ${fileExtension}. Please use MP4, MOV, MKV, WebM, FLV, or TS format with H.264/H.265 codec.`,
    };
  }

  // Check file size (5GB limit)
  const maxSize = 5 * 1024 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 5GB limit. Please compress your video or use a smaller file.',
    };
  }

  return { valid: true };
};
```

### 2. Updated File Input

- Changed `accept` attribute from generic `video/*` to specific formats
- Added helpful text showing supported formats and file size limit
- Validation runs immediately when user selects a file

### 3. Improved TUS Upload Metadata

- Changed from generic `filetype: "video/*"` to actual file MIME type: `filetype: selectedFile.type || "video/mp4"`
- This provides better information to Livepeer's transcoding service

### 4. User Feedback

- Clear error messages when unsupported formats are selected
- Toast notifications for validation failures
- Visual indication of supported formats below file input

## Files Modified

- `components/Videos/Upload/FileUpload.tsx`
  - Added `SUPPORTED_VIDEO_FORMATS` constant
  - Added `SUPPORTED_VIDEO_EXTENSIONS` constant
  - Added `validateVideoFile()` function
  - Updated `handleFileChange()` to validate files
  - Updated file input `accept` attribute
  - Added help text for supported formats
  - Updated TUS upload to use actual file MIME type

## Testing Recommendations

1. **Test with supported formats**: Upload MP4, MOV, WebM files with H.264 codec
2. **Test with unsupported formats**: Try uploading AVI, WMV, or other formats (should be rejected)
3. **Test file size limits**: Try uploading files over 5GB (should be rejected)
4. **Test error messages**: Verify clear error messages are shown for invalid files
5. **Test successful upload**: Ensure valid files upload and transcode successfully

## Converting Unsupported Videos

If you have a video in an unsupported format, you can convert it using FFmpeg:

### Convert to MP4 with H.264
```bash
ffmpeg -i input.avi -c:v libx264 -c:a aac -movflags +faststart output.mp4
```

### Convert to WebM with VP9
```bash
ffmpeg -i input.avi -c:v libvpx-vp9 -c:a libopus output.webm
```

### Convert MOV to MP4 (re-encode)
```bash
ffmpeg -i input.mov -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k output.mp4
```

### Check Video Codec and Container
```bash
ffprobe -v error -show_entries stream=codec_name,codec_type -of default=noprint_wrappers=1 input.mp4
```

## Best Practices

1. **Use MP4 with H.264**: Most widely compatible format
2. **Use "fast start" flag**: Enables progressive download/streaming
3. **Keep file sizes reasonable**: Under 2GB for better upload reliability
4. **Test before bulk upload**: Upload one test video first to ensure format compatibility
5. **Validate before upload**: The validation now happens client-side to prevent wasted upload time

## Additional Resources

- [Livepeer Documentation](https://docs.livepeer.org/)
- [Livepeer Asset API](https://docs.livepeer.org/api-reference/asset/upload)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Video Codec Comparison](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Video_codecs)

## Future Enhancements

Consider implementing:
1. **Deep codec inspection**: Use a library like `media-source` to inspect actual video/audio codecs
2. **Automatic conversion**: Client-side video conversion using FFmpeg.wasm
3. **Upload resume**: Better handling of failed uploads with retry logic
4. **Format detection**: Detect and warn about problematic codecs before upload starts
5. **Compression suggestions**: Suggest compression if file is too large

