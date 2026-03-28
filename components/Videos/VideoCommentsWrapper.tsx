"use client";

import { VideoComments } from "./VideoComments";

interface VideoCommentsWrapperProps {
  videoAssetId: number;
  videoName?: string;
  creatorAddress?: string | null;
}

/**
 * Client wrapper for VideoComments component
 * Used in server components to enable client-side functionality
 */
export function VideoCommentsWrapper({ 
  videoAssetId, 
  videoName, 
  creatorAddress 
}: VideoCommentsWrapperProps) {
  return (
    <VideoComments 
      videoAssetId={videoAssetId} 
      videoName={videoName} 
    />
  );
}


