export interface ThumbnailUploadResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Uploads a thumbnail image file to IPFS via the API route
 * This ensures the upload goes through the server to trigger the persistence backup layer
 * @param file - The image file to upload
 * @param playbackId - The video's playback ID for naming (unused in API but kept for signature compatibility)
 * @returns Promise<ThumbnailUploadResult>
 */
export async function uploadThumbnailToIPFS(
  file: File,
  playbackId: string
): Promise<ThumbnailUploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image'
      };
    }

    // Prepare FormData for API upload
    const formData = new FormData();
    formData.append('file', file);

    // Upload via API route
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Failed to upload thumbnail to IPFS'
      };
    }

    return {
      success: true,
      thumbnailUrl: result.url
    };

  } catch (error) {
    console.error('Error uploading thumbnail to IPFS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Converts a blob URL to a File object for uploading
 * @param blobUrl - The blob URL to convert
 * @param filename - The filename for the file
 * @returns Promise<File | null>
 */
export async function blobUrlToFile(blobUrl: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();

    // Create a File object from the blob
    const file = new File([blob], filename, { type: blob.type });
    return file;
  } catch (error) {
    console.error('Error converting blob URL to file:', error);
    return null;
  }
}

/**
 * Uploads a thumbnail from a blob URL to IPFS
 * @param blobUrl - The blob URL of the thumbnail
 * @param playbackId - The video's playback ID for naming
 * @returns Promise<ThumbnailUploadResult>
 */
export async function uploadThumbnailFromBlob(
  blobUrl: string,
  playbackId: string
): Promise<ThumbnailUploadResult> {
  try {
    // Convert blob URL to file
    const file = await blobUrlToFile(blobUrl, `thumbnail-${playbackId}.jpg`);

    if (!file) {
      return {
        success: false,
        error: 'Failed to convert blob URL to file'
      };
    }

    // Upload to IPFS
    return await uploadThumbnailToIPFS(file, playbackId);

  } catch (error) {
    console.error('Error uploading thumbnail from blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
