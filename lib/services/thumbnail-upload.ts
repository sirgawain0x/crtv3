import { IPFSService } from '@/lib/sdk/ipfs/service';

// Initialize IPFS service for thumbnail uploads
// Prefer KEY and PROOF for backend/serverless (recommended)
// Fallback to EMAIL for persistent environments
const ipfsService = new IPFSService({
  key: process.env.STORACHA_KEY,
  proof: process.env.STORACHA_PROOF,
  email: process.env.NEXT_PUBLIC_STORACHA_EMAIL,
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://w3s.link/ipfs'
});

export interface ThumbnailUploadResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Uploads a thumbnail image file to IPFS and returns a persistent URL
 * @param file - The image file to upload
 * @param playbackId - The video's playback ID for naming
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

    // Upload to IPFS with 5MB limit for thumbnails (larger than avatars)
    const result = await ipfsService.uploadFile(file, {
      pin: true,
      wrapWithDirectory: false,
      maxSize: 5 * 1024 * 1024 // 5MB for thumbnails
    });

    if (!result.success || !result.url) {
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
