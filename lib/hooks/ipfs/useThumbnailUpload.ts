"use client";

import { useCallback } from "react";
import { uploadThumbnailToIPFS, uploadThumbnailFromBlob, ThumbnailUploadResult } from "@/lib/services/thumbnail-upload";
import { logger } from '@/lib/utils/logger';


/**
 * Hook for uploading thumbnails using Helia (following helia-nextjs pattern)
 * 
 * This hook provides thumbnail upload functionality that uses Helia
 * from the HeliaProvider context as the primary method for IPFS operations.
 * 
 * @returns Object with upload functions and ready state
 * 
 * Example usage:
 * ```tsx
 * function ThumbnailUploadComponent() {
 *   const { uploadThumbnail, uploadFromBlob, isReady } = useThumbnailUpload();
 *   
 *   const handleUpload = async (file: File) => {
 *     if (!isReady) return;
 *     
 *     const result = await uploadThumbnail(file, 'playback-id');
 *     if (result.success) {
 *       logger.debug('Thumbnail uploaded:', result.thumbnailUrl);
 *     }
 *   };
 *   
 *   return <button onClick={() => handleUpload(file)} disabled={!isReady}>Upload</button>;
 * }
 * ```
 */
export function useThumbnailUpload() {
  // Grove service is initialized synchronously and doesn't require waiting
  const isReady = true;
  const error = null;

  const uploadThumbnail = useCallback(
    async (file: File, playbackId: string): Promise<ThumbnailUploadResult> => {
      return uploadThumbnailToIPFS(file, playbackId);
    },
    []
  );

  const uploadFromBlob = useCallback(
    async (blobUrl: string, playbackId: string): Promise<ThumbnailUploadResult> => {
      // Pass only 2 arguments as the service param is removed
      return uploadThumbnailFromBlob(blobUrl, playbackId);
    },
    []
  );

  return {
    uploadThumbnail,
    uploadFromBlob,
    isReady,
    error,
  };
}
