"use client";

import { useCallback } from "react";
import { useIpfsService } from "./useIpfsService";
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
  const { ipfsService, isReady, error } = useIpfsService();

  const uploadThumbnail = useCallback(
    async (file: File, playbackId: string): Promise<ThumbnailUploadResult> => {
      return uploadThumbnailToIPFS(file, playbackId, ipfsService);
    },
    [ipfsService]
  );

  const uploadFromBlob = useCallback(
    async (blobUrl: string, playbackId: string): Promise<ThumbnailUploadResult> => {
      return uploadThumbnailFromBlob(blobUrl, playbackId, ipfsService);
    },
    [ipfsService]
  );

  return {
    uploadThumbnail,
    uploadFromBlob,
    isReady,
    error,
  };
}
