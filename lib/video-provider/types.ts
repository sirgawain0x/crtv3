/** Shared DTOs across Livepeer Studio and FrameWorks providers. */

export type StreamSummary = {
  id: string;
  playbackId?: string;
  streamKey?: string;
  name?: string;
  isActive?: boolean;
};

export type CreateStreamParams = {
  name: string;
  profiles: Array<Record<string, unknown>>;
  record: boolean;
  playbackPolicy: Record<string, unknown>;
  creatorId: string;
};

export type CreatedStream = {
  streamId: string;
  playbackId: string;
  streamKey: string;
};

export type StreamSession = {
  id: string;
  parentId?: string;
  recordingStatus?: string;
  recordingUrl?: string;
  mp4Url?: string;
  sourceSegmentsDuration?: number;
  createdAt?: number;
};

export type AssetSource = {
  type?: string;
  sessionId?: string;
  streamId?: string;
};

export type AssetSummary = {
  id: string;
  name?: string;
  playbackId?: string;
  playbackUrl?: string;
  source?: AssetSource;
  videoSpec?: { duration?: number };
  status?: { phase?: string };
};

export type CreateClipParams = {
  playbackId: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  name?: string;
};

export type CreateClipResult = {
  playbackUrl: string;
  assetId: string;
  newPlaybackId: string;
  error?: string;
};

export type PlaybackThumbnailSource = {
  type?: string;
  hrn?: string;
  url?: string;
};

export type PlaybackInfoResult = {
  playbackInfo?: {
    meta?: { source?: PlaybackThumbnailSource[] };
  };
};
