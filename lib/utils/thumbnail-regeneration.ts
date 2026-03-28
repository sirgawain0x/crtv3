import { getThumbnailFromVTT } from '@/services/livepeer-thumbnails';
import { uploadThumbnailToIPFS } from '@/lib/services/thumbnail-upload';
import { convertFailingGateway, parseIpfsUriWithFallback } from '@/lib/utils/image-gateway';
import { logger } from '@/lib/utils/logger';

/**
 * Downloads an image from a URL and converts it to a File object
 * @param url - The URL of the image to download
 * @param filename - The filename for the file
 * @returns Promise<File | null>
 */
export async function downloadImageAsFile(url: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.error(`Failed to fetch image from ${url}: ${response.status}`);
      return null;
    }

    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  } catch (error) {
    logger.error('Error downloading image from URL:', error);
    return null;
  }
}

/**
 * Validates if a thumbnail URL is accessible
 * @param url - The thumbnail URL to validate
 * @returns Promise<boolean>
 */
export async function validateThumbnailUrl(url: string): Promise<boolean> {
  if (!url || url.trim() === '') {
    return false;
  }

  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    // With no-cors, we can't read the status, but if it doesn't throw, it's likely accessible
    return true;
  } catch (error) {
    // Try a full fetch as fallback
    try {
      const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch (fetchError) {
      logger.warn(`Thumbnail URL validation failed for ${url}:`, fetchError);
      return false;
    }
  }
}

/**
 * Regenerates a thumbnail from Livepeer VTT and uploads to IPFS
 * @param playbackId - The video's playback ID
 * @param assetId - The video asset ID (for naming)
 * @returns Promise with success status and thumbnail URL
 */
export async function regenerateThumbnailFromLivepeer(
  playbackId: string,
  assetId?: string
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  try {
    logger.debug(`[ThumbnailRegen] Starting regeneration for playbackId: ${playbackId}`);

    // Step 1: Fetch thumbnail URL from Livepeer VTT
    const vttResult = await getThumbnailFromVTT({ playbackId });
    
    if (!vttResult.success) {
      return {
        success: false,
        error: vttResult.error || 'Failed to fetch thumbnail from Livepeer VTT',
      };
    }

    // After success check, TypeScript should narrow, but we need to assert the type
    // because ActionResponse uses optional data field
    const thumbnailUrl = (vttResult.data as { thumbnailUrl: string } | undefined)?.thumbnailUrl;
    if (!thumbnailUrl) {
      return {
        success: false,
        error: 'Thumbnail URL not found in response',
      };
    }
    logger.debug(`[ThumbnailRegen] Fetched thumbnail URL from Livepeer: ${thumbnailUrl}`);

    // Step 2: Download the thumbnail image
    const filename = `thumbnail-${assetId || playbackId}-${Date.now()}.jpg`;
    const imageFile = await downloadImageAsFile(thumbnailUrl, filename);

    if (!imageFile) {
      return {
        success: false,
        error: 'Failed to download thumbnail image from Livepeer',
      };
    }

    logger.debug(`[ThumbnailRegen] Downloaded thumbnail image: ${imageFile.name}`);

    // Step 3: Upload to IPFS
    const uploadResult = await uploadThumbnailToIPFS(
      imageFile,
      assetId || playbackId
    );

    if (!uploadResult.success || !uploadResult.thumbnailUrl) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload thumbnail to IPFS',
      };
    }

    // Step 4: Convert IPFS URL to gateway URL
    const ipfsUrl = convertFailingGateway(uploadResult.thumbnailUrl);
    const finalUrl = ipfsUrl.startsWith('ipfs://')
      ? parseIpfsUriWithFallback(ipfsUrl, 0)
      : ipfsUrl;

    logger.debug(`[ThumbnailRegen] ✅ Successfully regenerated thumbnail: ${finalUrl}`);

    return {
      success: true,
      thumbnailUrl: finalUrl,
    };
  } catch (error) {
    logger.error('[ThumbnailRegen] Error regenerating thumbnail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Attempts to fix a broken thumbnail by regenerating from Livepeer
 * @param playbackId - The video's playback ID
 * @param assetId - The video asset ID
 * @returns Promise with success status and new thumbnail URL
 */
export async function fixBrokenThumbnail(
  playbackId: string,
  assetId?: string
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  return regenerateThumbnailFromLivepeer(playbackId, assetId);
}
