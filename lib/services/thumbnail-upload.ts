import { ipfsService } from '@/lib/sdk/ipfs/service';

export interface ThumbnailUploadResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Uploads a thumbnail image file using hybrid storage:
 * - Lighthouse (Primary) - Better CDN distribution, especially for West Coast
 * - Storacha (Backup) - Ensures long-term persistence
 * - Filecoin First (Optional) - Long-term archival if enabled
 * @param file - The image file to upload
 * @param playbackId - The video's playback ID (unused but kept for signature compatibility)
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

    console.log('Starting hybrid upload (Lighthouse primary, Storacha backup, Filecoin archival if enabled)...');

    // Use the default IPFS service instance which is pre-configured with all storage options
    // This ensures consistency across the app and includes Filecoin archival if enabled

    // Use the default IPFS service (pre-configured with Lighthouse, Storacha, and optional Filecoin)
    const result = await ipfsService.uploadFile(file, {
      pin: true,
      wrapWithDirectory: false
    });

    if (!result.success || !result.hash) {
      return {
        success: false,
        error: result.error || 'Upload failed'
      };
    }

    console.log('✅ Thumbnail upload successful:', result.hash);
    console.log('📍 Accessible via:', result.url);

    // Return the CID format expected by the app (IPFS URI)
    return {
      success: true,
      thumbnailUrl: `ipfs://${result.hash}`
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
