import { ipfsService } from '@/lib/sdk/ipfs/service';
import { IPFSService } from '@/lib/sdk/ipfs/service';

export interface ThumbnailUploadResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Uploads a thumbnail image file using Helia (following helia-nextjs pattern):
 * - Helia (Primary) - Following helia-nextjs pattern
 * - Lighthouse (Background) - Better CDN distribution
 * - Storacha (Background) - Ensures long-term persistence
 * - Filecoin First (Background, Optional) - Long-term archival if enabled
 * 
 * @param file - The image file to upload
 * @param playbackId - The video's playback ID (unused but kept for signature compatibility)
 * @param service - Optional IPFS service instance (defaults to global instance with fallback)
 * @returns Promise<ThumbnailUploadResult>
 */
export async function uploadThumbnailToIPFS(
  file: File,
  playbackId: string,
  service?: IPFSService
): Promise<ThumbnailUploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image'
      };
    }

    console.log('[ThumbnailUpload] Starting upload with Helia (following helia-nextjs pattern)...');

    // Use provided service or default IPFS service instance
    // Following helia-nextjs pattern: uses Helia from context if available via hook
    const ipfs = service || ipfsService;
    
    const result = await ipfs.uploadFile(file, {
      pin: true,
      wrapWithDirectory: false
    });

    if (!result.success || !result.hash) {
      return {
        success: false,
        error: result.error || 'Upload failed'
      };
    }

    console.log('[ThumbnailUpload] ✅ Thumbnail upload successful:', result.hash);
    console.log('[ThumbnailUpload] 📍 Accessible via:', result.url);

    // Return the CID format expected by the app (IPFS URI)
    return {
      success: true,
      thumbnailUrl: `ipfs://${result.hash}`
    };

  } catch (error) {
    console.error('[ThumbnailUpload] ❌ Error uploading thumbnail to IPFS:', error);
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
 * Following helia-nextjs pattern with Helia as primary method
 * 
 * @param blobUrl - The blob URL of the thumbnail
 * @param playbackId - The video's playback ID for naming
 * @param service - Optional IPFS service instance (defaults to global instance with fallback)
 * @returns Promise<ThumbnailUploadResult>
 */
export async function uploadThumbnailFromBlob(
  blobUrl: string,
  playbackId: string,
  service?: IPFSService
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

    // Upload to IPFS (following helia-nextjs pattern)
    return await uploadThumbnailToIPFS(file, playbackId, service);

  } catch (error) {
    console.error('[ThumbnailUpload] ❌ Error uploading thumbnail from blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
