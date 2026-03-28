# Transcoding Error Fix

## Issue
Users were seeing an error message showing `Transcoding failed. Full asset data: {}` in the console, indicating that the video asset data was empty when checking transcoding status.

### Error Details
```
Transcoding failed. Full asset data: {}
    at CreateThumbnail.useInterval (components/Videos/Upload/Create-thumbnail.tsx:65:23)
```

## Root Causes

The empty asset data `{}` can occur for several reasons:

1. **Invalid Asset ID**: The asset ID being passed to the component is undefined, null, or invalid
2. **API Response Issues**: Livepeer API is not returning the expected asset structure
3. **Timing Issues**: Component trying to fetch asset before it's fully created
4. **Silent Failures**: Errors in the `getLivepeerAsset` function were not being properly logged or handled

## Solution

### 1. Enhanced Error Handling in API Layer

**File: `/app/api/livepeer/assetUploadActions.ts`**

Added comprehensive error handling and validation:

```typescript
export const getLivepeerAsset = async (livePeerAssetId: string) => {
  try {
    // Validate input
    if (!livePeerAssetId) {
      throw new Error('Asset ID is required');
    }

    const result = await fullLivepeer.asset.get(livePeerAssetId);

    // Validate response
    if (!result?.asset) {
      console.error('No asset found in result:', result);
      throw new Error('Asset not found or invalid response from Livepeer');
    }

    return result.asset;
  } catch (error: any) {
    // Enhanced logging
    console.error('Error fetching Livepeer asset:', {
      assetId: livePeerAssetId,
      error: error?.message,
      statusCode: error?.statusCode,
    });
    throw new Error(error?.message || 'Failed to fetch video asset');
  }
};
```

**Benefits:**
- Validates asset ID before making API call
- Checks if response contains expected data structure
- Provides detailed logging for debugging
- Throws meaningful error messages

### 2. Improved Polling Logic

**File: `/components/Videos/Upload/Create-thumbnail.tsx`**

#### Component Initialization Validation
Added validation on mount to catch issues early:

```typescript
useEffect(() => {
  console.log('CreateThumbnail mounted with:', {
    livePeerAssetId,
    hasAssetId: !!livePeerAssetId,
    assetIdType: typeof livePeerAssetId,
  });
  
  if (!livePeerAssetId) {
    console.error('CreateThumbnail: No asset ID provided!');
    toast.error("No video asset ID found. Please go back and upload your video again.");
  }
}, [livePeerAssetId]);
```

#### Initial Asset Fetch
Added immediate fetch on mount instead of waiting for first polling interval:

```typescript
useEffect(() => {
  if (livePeerAssetId && !livepeerAssetData) {
    console.log('Initial fetch for asset:', livePeerAssetId);
    getLivepeerAsset(livePeerAssetId)
      .then((data) => {
        if (data) {
          console.log('Initial asset data fetched:', {
            phase: data?.status?.phase,
            progress: data?.status?.progress,
          });
          setLivepeerAssetData(data);
        }
      })
      .catch((e) => {
        console.error("Error on initial asset fetch:", e);
        toast.error(
          "Failed to load video information. Please check if the video was uploaded successfully.",
          { duration: 5000 }
        );
      });
  }
}, [livePeerAssetId, livepeerAssetData]);
```

#### Enhanced Polling with Better Error Handling
Improved the polling interval logic:

```typescript
useInterval(
  () => {
    if (livePeerAssetId) {
      getLivepeerAsset(livePeerAssetId)
        .then((data) => {
          if (!data) {
            console.error('No asset data returned for ID:', livePeerAssetId);
            toast.error("Failed to retrieve video information. Please refresh the page.");
            return;
          }

          console.log('Livepeer asset status:', {
            assetId: livePeerAssetId,
            phase: data?.status?.phase,
            progress: data?.status?.progress,
            errorMessage: data?.status?.errorMessage,
            updatedAt: data?.status?.updatedAt,
            hasPlaybackId: !!data?.playbackId,
          });
          
          setLivepeerAssetData(data);
          
          if (data?.status?.phase === "failed") {
            console.error('Transcoding failed. Full asset data:', JSON.stringify(data, null, 2));
            const errorMsg = data.status.errorMessage || "Unknown error during video processing";
            toast.error(
              `Video transcoding failed: ${errorMsg}`,
              { 
                duration: 10000,
                description: "Please try uploading your video again or contact support."
              }
            );
            return false;
          }

          if (data?.status?.phase === "ready") {
            toast.success("Video is ready!", { duration: 2000 });
          }
        })
        .catch((e) => {
          console.error("Error retrieving livepeer asset:", {
            assetId: livePeerAssetId,
            error: e?.message,
            stack: e?.stack,
          });
          toast.error(
            e?.message || "Error retrieving video status. Please refresh the page.",
            { duration: 5000 }
          );
        });
    } else {
      console.warn('No livePeerAssetId provided to polling interval');
    }
  },
  livepeerAssetData?.status?.phase !== "ready" &&
    livepeerAssetData?.status?.phase !== "failed"
    ? 5000
    : null
);
```

#### Better UI State Display
Improved the display when asset data is not available:

```typescript
<h3 className="text-lg">
  Video Transcoding: {livepeerAssetData?.status?.phase ? String(livepeerAssetData.status.phase) : "Loading..."}
</h3>
{!livepeerAssetData && (
  <p className="text-sm text-muted-foreground mt-2">
    Fetching video information...
  </p>
)}
```

## Key Improvements

### 1. **Comprehensive Logging**
- Log component initialization with asset ID validation
- Log each polling attempt with detailed status
- Log both successful and failed API calls
- Include structured data in console logs for easier debugging

### 2. **User-Friendly Error Messages**
- Specific error messages for different failure scenarios
- Actionable guidance (e.g., "Please go back and upload your video again")
- Toast notifications with proper duration and descriptions

### 3. **Defensive Programming**
- Check for undefined/null values at each step
- Validate data structures before using them
- Early returns when data is invalid
- Graceful degradation when optional features fail

### 4. **Better UX**
- Show "Loading..." instead of "undefined" when waiting for data
- Display helpful messages during loading states
- Success toast when video is ready
- Clear error messages with recovery instructions

## Debugging Guide

If you encounter transcoding errors, check the console logs for:

### 1. **Component Initialization**
```
CreateThumbnail mounted with: {
  livePeerAssetId: "abc123...",
  hasAssetId: true,
  assetIdType: "string"
}
```
- Verify `hasAssetId` is `true`
- Verify `assetIdType` is `"string"`
- If `livePeerAssetId` is undefined, the issue is in the upload flow

### 2. **Initial Fetch**
```
Initial fetch for asset: abc123...
Initial asset data fetched: {
  phase: "processing",
  progress: 0.25
}
```
- Confirms asset exists in Livepeer
- Shows initial processing status

### 3. **Polling Updates**
```
Livepeer asset status: {
  assetId: "abc123...",
  phase: "processing",
  progress: 0.5,
  errorMessage: null,
  updatedAt: "2025-01-09T...",
  hasPlaybackId: true
}
```
- Track progress through processing phases
- Check for error messages
- Verify playbackId is present

### 4. **API Errors**
```
Error fetching Livepeer asset: {
  assetId: "abc123...",
  error: "Asset not found",
  statusCode: 404
}
```
- Indicates specific API failure
- Shows HTTP status codes
- Helps identify if asset was deleted or never created

## Common Issues and Solutions

### Issue: Asset ID is undefined
**Symptoms:** 
- `hasAssetId: false` in console
- Error toast: "No video asset ID found"

**Solution:**
- Check file upload completed successfully
- Verify `setLivepeerAsset` is called in FileUpload component
- Check if asset ID is being passed through component props correctly

### Issue: Asset not found in Livepeer
**Symptoms:**
- Error: "Asset not found or invalid response from Livepeer"
- 404 status code in logs

**Solution:**
- Verify asset was created successfully in Livepeer
- Check Livepeer dashboard for asset existence
- Ensure using correct Livepeer API key
- Check if asset was deleted

### Issue: Transcoding actually failed
**Symptoms:**
- `phase: "failed"` in status
- Error message in `data.status.errorMessage`

**Solution:**
- Check video file format and codec compatibility
- Verify file size is within limits
- Check Livepeer service status
- Review video file for corruption
- Try re-uploading the video

## Testing Recommendations

1. **Test Asset ID Validation**
   - Try navigating to thumbnail step without uploading
   - Verify error messages appear

2. **Test API Failures**
   - Use invalid asset ID
   - Verify error handling and user feedback

3. **Test Normal Flow**
   - Upload video and proceed to thumbnail step
   - Verify progress updates appear
   - Verify "Video is ready!" toast appears

4. **Test Failed Transcoding**
   - Upload invalid video format (if possible)
   - Verify error message includes actual error from Livepeer

## Related Files
- `/app/api/livepeer/assetUploadActions.ts` - Livepeer API integration
- `/components/Videos/Upload/Create-thumbnail.tsx` - Thumbnail creation component
- `/components/Videos/Upload/FileUpload.tsx` - File upload component
- `/components/Videos/Upload/index.tsx` - Main upload flow

## Additional Notes
- This fix provides better observability into the transcoding process
- All errors now have actionable user guidance
- Comprehensive logging helps with production debugging
- The solution follows React best practices for error handling

