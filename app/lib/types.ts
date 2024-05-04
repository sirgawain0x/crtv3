import * as z from 'zod';

export type AssetData = {
  assetId: string;
  title: string;
  description: string;
  video: Asset;
  views: Views;
  details?: MintDetails;
  currency?: Currency;
}

export type Asset = {
  id: string;
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
      };
      nftMetadata: {
        cid: string;
        url: string;
        gatewayUrl: string;
      };
      updatedAt: number;
      cid: string;
      url: string;
      gatewayUrl: string;
    };
    status: {
      phase: string;
      progress: number;
      errorMessage: string;
      tasks: {
        pending: string;
        last: string;
        failed: string;
      };
    };
  };
  status: {
    phase: string;
    updatedAt: number;
    progress: number;
    errorMessage: string;
  };
  name: string;
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