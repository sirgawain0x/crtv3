import * as z from 'zod';

export type AssetData = {
  id: string;
  name: string;
  description?: string;
  video: Asset;
  playbackInfo: PlaybackInfo;
  views?: Views;
  details?: MintDetails;
  currency?: Currency;
};

export type Asset = {
  id: string;
  type?: AssetType;
  playbackId?: string;
  playbackUrl?: string; // Corrected typo
  downloadUrl?: string;
  playbackPolicy?: {
    type: PlaybackPolicyType;
    webhookId?: string;
    webhookContext?: Record<string, unknown>;
    refreshInterval?: number;
  };
  source: {
    type: SourceType;
    url?: string;
    gatewayUrl?: string;
    encryption?: Record<string, unknown>;
    sourceId?: string;
    sessionId?: string;
    playbackId?: string;
    requesterId?: string;
    assetId?: string;
  };
  creatorId: {
    type: CreatorIdType;
    value: string;
  };
  storage?: {
    ipfs?: {
      spec?: {
        nftMetadataTemplate?: TemplateType;
        nftMetadata?: Record<string, unknown>;
      };
      nftMetadata?: {
        cid: string;
        url?: string;
        gatewayUrl?: string;
      };
      updatedAt?: number;
      cid?: string;
      url?: string;
      gatewayUrl?: string;
    };
    status?: {
      phase: StorageStatusPhase;
      progress?: number;
      errorMessage?: string;
      tasks: {
        pending: string;
        last: string;
        failed: string;
      };
    };
  };
  status?: {
    phase: AssetStatusPhase;
    updatedAt: number;
    progress: number;
    errorMessage: string;
  };
  name: string;
  projectId?: string;
  createdAt?: number;
  createdByTokenName?: string;
  size?: number;
  hash?: Array<{
    hash?: string;
    algorithm?: string;
  }>;
  videoSpec: {
    format?: string;
    duration?: number;
    bitrate?: number;
    tracks?: Array<{
      type: AssetType;
      codec: string;
      startTime?: number;
      duration?: number;
      bitrate?: number;
      width?: number;
      height?: number;
      pixelFormat?: string;
      fps?: number;
      channels?: number;
      sampleRate?: number;
      bitDepth?: number;
    }>;
  };
};

export type PlaybackInfo = {
  type: PlaybackType;
  meta: {
    live?: number;
    playbackPolicy?: {
      type: string;
      webhookId: string;
      webhookContext: {
        streamerId: string;
      };
      refreshInterval: number;
      allowedOrigins: [string];
    };
    source: [
      {
        hrn: 'MP4';
        type: 'html5/video/mp4';
        url: 'https://asset-cdn.lp-playback.monster/hls/1bde4o2i6xycudoy/static360p0.mp4';
        size: 494778;
        width: 204;
        height: 360;
        bitrate: 449890;
      },
    ];
    dvrPlayback?: [
      {
        hrn: MetaSourceHrn;
        type: string;
        url: string;
        error: string;
      },
    ];
    attestation?: {
      id: string;
      primaryType: string;
      domain: {
        name: string;
        version: string;
      };
      message: {
        video: string;
        attestations: [
          {
            role: string;
            address: string;
          },
        ];
        signer: string;
        timestamp: number;
      };
      signature: string;
      createdAt: number;
      signatureType: MetaAttSigType;
      storage: {
        ipfs: {
          updatedAt: number;
          cid: string;
          url: string;
          gatewayUrl: string;
        };
        status: {
          phase: MetaAttStorageStatusPhase;
          progress: number;
          errorMessage: string;
          tasks: {
            pending: string;
            last: string;
            failed: string;
          };
        };
      };
    };
  };
};

export enum AssetType {
  Video = 'Video',
  Audio = 'Audio',
}

export enum SourceType {
  Url = 'url',
  Recording = 'recording',
  DirectUpload = 'directUpload',
  Clip = 'clip',
}

export enum CreatorIdType {
  Unverified = 'unverified',
}

export enum TemplateType {
  File = 'file',
  Player = 'player',
}

export enum StorageStatusPhase {
  Waiting = 'waiting',
  Processing = 'processing',
  Ready = 'ready',
  Failed = 'failed',
  Reverted = 'reverted',
}

export enum AssetStatusPhase {
  Uploading = 'uploading',
  Waiting = 'waiting',
  Processing = 'processing',
  Ready = 'ready',
  Failed = 'failed',
  Deleting = 'deleting',
  Deleted = 'deleted',
}

export type Views = {
  playbackId: string;
  dStorageUrl: string;
  viewCount: number;
  playtimeMins: number;
};

export type MintDetails = {
  nFTAmountToMint: number;
  pricePerNFT: number;
};

export enum Currency {
  USDC = 'USDC',
  ETH = 'ETH',
}

export enum PlaybackType {
  Live = 'live',
  Vod = 'vod',
  Recording = 'recording',
}

export enum MetaSourceHrn {
  HLS = 'HLS (TS)',
  MP4 = 'MP4',
  WebRTC = 'WebRTC (H264)',
  FLV = 'FLV (H264)',
  Thumbnail = 'Thumbnail (JPEG)',
  Thumbnails = 'Thumbnails',
}

export enum MetaAttSigType {
  EIP712 = 'eip712',
  FLOW = 'flow',
}

export enum MetaAttStorageStatusPhase {
  Waiting = 'waiting',
  Ready = 'ready',
  Processing = 'processing',
  Failed = 'failed',
  Reverted = 'reverted',
}

export type UploadAssetData = {
  name: string;
  staticMp4?: boolean;
  playbackPolicy?: {
    type: PlaybackPolicyType;
    webhookId?: string;
    webhookContext?: Record<string, unknown>;
    refreshInterval?: number;
  };
  creatorId?: {
    type: string;
    value: string;
  };
  storage?: {
    ipfs?: {
      spec?: null;
    };
  };
  url?: string;
  encryption?: {
    encryptedKey: string;
  };
  c2pa?: boolean;
  profiles?: Array<{
    width?: number;
    name?: string;
    height?: number;
    bitrate?: number;
    quality?: number;
    fps?: number;
    fpsDen?: number;
    gop?: string;
    profile?: Profile;
    encoder?: Encoder;
  }>;
  targetSegmentSizesSecs?: number;
};

export enum PlaybackPolicyType {
  Public = 'public',
  Jwt = 'jwt',
  Webhook = 'webhook',
}

export enum Profile {
  H264Baseline = 'H264Baseline',
  H264Main = 'H264Main',
  H264High = 'H264High',
  H264ConstrainedHigh = 'H264ConstrainedHigh',
}

export enum Encoder {
  H264 = 'H.264',
  HEVC = 'HEVC',
  VP8 = 'VP8',
  VP9 = 'VP9',
}

const MAX_FILESIZE = 1073741824;
const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/mov',
  'video/flv',
  'video/avi',
];

export const createAssetSchema = z.object({
  asset: z
    .custom<File>()
    .refine((file) => file, 'Video file must be provided.')
    .refine(
      (file) => file.size <= MAX_FILESIZE,
      'Video file must be less than 1GB.',
    )
    .refine(
      (files) => ACCEPTED_VIDEO_TYPES.includes(files?.type),
      '.mp4, .webm, .ogg, .flv, .avi and .mov files are accepted.',
    ),
  name: z.string().max(100),
  description: z.string().max(1000),
  creatorId: z.string().max(100),
});

export type CreateAssetType = z.infer<typeof createAssetSchema>;
