import * as z from 'zod';

export type AssetData = {
  id: string;
  title: string;
  description: string;
  video: Asset;
  views: Views;
  details?: MintDetails;
  currency?: Currency;
}

export type Asset = {
  id: string;
<<<<<<< Updated upstream
  type: string;
  playbackId: string;
  playbackUrl: string;
  downloadUrl: string;
  playbackPolicy: {
    type: string;
    webhookId: string;
    webhookContext: {};
    refreshInterval: number;
  };
  source: {
    type: string;
    url: string;
    gatewayUrl: string;
    encryption: {};
  };
  creatorId: {
    type: string;
    value: string;
  };
  storage: {
    ipfs: {
      spec: {
        nftMetadataTemplate: string;
        nftMetadata: {
          description: string;
          image: string;
          properties: {
            [idx: string]: any;
            nFTAmountToMint: number | string;
            pricePerNFT: number | string;
          };
        };
=======
  type?: AssetType;
  playbackId?: string;
  plabackUrl?: string;
  downloadUrl?: string;
  playbackPolicy?: {
    type: PlaybackPolicyType;
    webhookId?: string;
    webhookContext?: {};
    refreshInterval?: number;
  };
  source: {
    type: SourceType;
    url?: string;
    gatewayUrl?: string;
    encryption?: {};
    sourceId?: string;
    sessionId?: string;
    playbackId?: string;
    requesterId?: string;
    assetId?: string;
  }
  creatorId: {
    type: CreatorIdType;
    value: string;
  };
  storage?: {
    ipfs?: {
      spec?: {
        nftMetadataTemplate?: TemplateType;
        nftMetadata?: {};
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  status: {
    phase: string;
=======
  status?: {
    phase: AssetStatusPhase;
>>>>>>> Stashed changes
    updatedAt: number;
    progress: number;
    errorMessage: string;
  };
  name: string;
<<<<<<< Updated upstream
  projectId: string;
  createdAt: number;
  createdByTokenName: string;
  size: number;
  hash: [
    {
      hash: string;
      algorithm: string;
    },
  ];
  videoSpec: {
    format: string;
    duration: number;
    bitrate: number;
    tracks: [
      {
        type: string;
        codec: string;
        startTime: number;
        duration: number;
        bitrate: number;
        width: number;
        height: number;
        pixelFormat: string;
        fps: number;
        channels: number;
        sampleRate: number;
        bitDepth: number;
      },
    ];
  };
}
=======
  projectId?: string;
  createdAt?: number;
  createdByTokenName?: string;
  size?: number;
  hash?: [{
    hash?: string;
    algorithm?: string;
  }];
  videoSpec: {
    format?: string;
    duration?: number;
    bitrate?: number;
    tracks?: [{
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
    }]
  }
};
>>>>>>> Stashed changes

export enum AssetType {
  video = 'Video',
  audio = 'Audio',
}

export enum SourceType {
  url = 'url',
  recording = 'recording',
  directUpload = 'directUpload',
  clip = 'clip',
}

export enum CreatorIdType {
  unverified = 'unverified',
}

export enum TemplateType {
  file = 'file',
  player = 'player',
}

export enum StorageStatusPhase {
  waiting = 'waiting',
  processing = 'processing',
  ready = 'ready',
  failed = 'failed',
  reverted ='reversed',
}

export enum AssetStatusPhase {
  uploading = 'uploading',
  waiting = 'waiting',
  processing = 'processing',
  ready ='ready',
  failed = 'failed',
  deleting = 'deleting',
  deleted = 'deleted',
}

export type Views = {
  playbackId: string;
  dStorageUrl: string;
  viewCount: number;
  playtimeMins: number;
}

export type MintDetails = {
  nFTAmountToMint: number
  pricePerNFT: number
}

export enum Currency {
  USDC = 'USDC',
  ETH = 'ETH',
} 

export type UploadAssetData = {
  name: string;
  staticMp4?: boolean;
  playbackPolicy?: {
    type: PlaybackPolicyType;
    webhookId?: string;
    webhookContext?: {};
    refreshInterval?: number;
  }
  creatorId?: {
    type: string;
    value: string;
  }
  storage?: {
    ipfs?: {
      spec?: null;
    };
  }
  url?: string;
  encryption?: {
    encryptedKey: string;
  }
  c2pa?: boolean;
  profiles?: [{
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
  }];
  targetSegmentSizesSecs?: number;
}

export enum PlaybackPolicyType {
  public = 'public',
  jwt = 'jwt',
  webhook = 'webhook',
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
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/flv', 'video/avi'];

export const createAssetSchema = z.object({
  asset: z
  .custom<File>()
  .refine((file) => file?.length == 1, "Video file must be provided.")
  .refine((file) => file.size <= MAX_FILESIZE, "Video file must be less than 1GB.")
  .refine(
    (files) => ACCEPTED_VIDEO_TYPES.includes(files?.type),
    ".mp4, .webm, .ogg, .flv, .avi and .mov files are accepted."),
  title: z.string().max(100),
  description: z.string().max(1000),
  creatorId: z.string().max(100),
})

export type CreateAssetType = z.infer<typeof createAssetSchema>;