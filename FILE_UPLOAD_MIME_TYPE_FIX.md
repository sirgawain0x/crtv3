# File Upload MIME Type Validation Fix

## Summary
Fixed the MIME type fallback logic in `components/Videos/Upload/FileUpload.tsx` to prevent mislabeling non-MP4 files with incorrect MIME types.

## Problem
Previously, the code at line 266 would fall back to `"video/mp4"` when `selectedFile.type` was empty, which could mislabel non-MP4 uploads and cause issues with video processing.

```typescript
// OLD CODE (line 266)
filetype: selectedFile.type || "video/mp4", // Could mislabel files!
```

## Solution Implemented
Implemented **Option A**: Enforce MIME presence during validation and reject files with empty/unknown MIME types.

### Changes Made

#### 1. Enhanced Validation (Lines 170-203)
Added a new validation check at the beginning of the `validateVideoFile` function:

```typescript
// Check MIME type presence first - reject files with empty/unknown MIME types
if (!file.type || file.type.trim() === '') {
  return {
    valid: false,
    error: 'Unable to determine file type. Please ensure you are uploading a valid video file with a recognized format (MP4, MOV, MKV, WebM, FLV, or TS).',
  };
}
```

This ensures that:
- Files with empty MIME types are rejected before upload
- Users receive a clear error message explaining the issue
- Only files with valid, detectable MIME types proceed to upload

#### 2. Updated Fallback (Lines 270-276)
Changed the defensive fallback from `"video/mp4"` to `"application/octet-stream"`:

```typescript
// NEW CODE (line 275)
// Validation should ensure type is always present, but use safe fallback as defensive measure
filetype: selectedFile.type || "application/octet-stream",
```

This provides:
- A generic, safe fallback that doesn't misidentify the file
- Defense-in-depth: the validation should prevent empty types, but this ensures safety if validation is bypassed
- Proper labeling if the file type is truly unknown

## Benefits

1. **Prevents Misidentification**: Files are no longer incorrectly labeled as MP4
2. **Better User Experience**: Clear error messages guide users to upload valid files
3. **Safer Processing**: Video processing pipeline receives accurate MIME type information
4. **Defense-in-Depth**: Multiple layers of protection against invalid file types

## Validation Flow

```
User selects file
    ↓
Check if file.type exists and is not empty
    ↓ (fails)
    └──→ Error: "Unable to determine file type..."
    ↓ (passes)
Check file extension against whitelist
    ↓
Check MIME type against whitelist
    ↓
Check file size (5GB limit)
    ↓
File accepted for upload
    ↓
Upload with actual MIME type (or safe fallback if somehow missed)
```

## Testing Recommendations

If adding unit tests in the future, test the following scenarios:

### 1. Valid Files
- ✅ File with correct MIME type (`video/mp4`, `video/quicktime`, etc.)
- ✅ File with valid extension and matching MIME type
- ✅ File under 5GB size limit

### 2. Invalid Files - Should Reject
- ❌ File with empty MIME type (`file.type === ""`)
- ❌ File with whitespace-only MIME type (`file.type === "   "`)
- ❌ File with unsupported MIME type
- ❌ File with unsupported extension
- ❌ File exceeding 5GB size limit

### 3. Edge Cases
- Test files from different browsers (MIME type detection varies)
- Test files with unusual but valid extensions
- Test files uploaded via drag-and-drop vs file picker

## Files Modified
- `components/Videos/Upload/FileUpload.tsx`
  - Lines 170-203: Enhanced `validateVideoFile` function
  - Lines 270-276: Updated MIME type fallback in TUS upload

## No Breaking Changes
This change is backward compatible:
- Existing valid files continue to work
- Only rejects files that would have been mislabeled before
- Improves error messaging for invalid uploads

## Related Files
- `services/video-assets.ts` - Video asset processing
- `app/api/livepeer/assetUploadActions.ts` - Livepeer upload integration
- Livepeer documentation for supported formats

## Supported Video Formats
The following formats are validated and supported:
- **Containers**: MP4, MOV, MKV, WebM, FLV, TS
- **Codecs**: H.264, H.265 (HEVC), VP8, VP9, AV1
- **Max Size**: 5GB

## Future Enhancements
Consider adding:
1. Unit tests for the validation logic
2. Integration tests for the upload flow
3. E2E tests for user file upload scenarios
4. File type detection using magic numbers as additional validation

