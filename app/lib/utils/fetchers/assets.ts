export type AssetData = {
  id: string;
  user: string;
  title: string;
  description: string;
  video: Video;
  views: Views;
};

export type Video = {
  id?: string ;
  name: string;
  status: {
    phase: string | null;
    updatedAt: bigint;
    progress: string | null;
    errorMessage: string | null;
  };
  playbackId: string;
  creatorId: { [index: string]: string };
  storage: {
    ipfs: {
      cid: string;
      gateway: string;
      url: string;
      nftMetadata: {
        cid: string;
        gateway: string;
        url: string;
      };
      spec: {
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
    };
  };
  transcodingStatus: string;
  createdAt: bigint;
  updatedAt: bigint;
  downloadUrl?: string;
  viewCount: number;
};

export type Views = {
  [x: string]: any;
  id?: string | null;
  playbackId: string;
  publicViews: any;
};