"use client";

import { VideoChat } from "./VideoChat";

interface VideoChatWrapperProps {
  videoId: string;
  videoName?: string;
  creatorAddress?: string | null;
}

/**
 * Client wrapper for VideoChat component
 * Used in server components to enable client-side functionality
 */
export function VideoChatWrapper({ videoId, videoName, creatorAddress }: VideoChatWrapperProps) {
  return <VideoChat videoId={videoId} videoName={videoName} creatorAddress={creatorAddress} />;
}

