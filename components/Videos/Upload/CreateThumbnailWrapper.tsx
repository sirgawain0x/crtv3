"use client";

import CreateThumbnail from "./Create-thumbnail";

interface CreateThumbnailWrapperProps {
  livePeerAssetId: string | undefined;
  thumbnailUri?: string;
  videoAssetId?: number;
  creatorAddress?: string;
  onComplete: (data: {
    thumbnailUri: string;
    meTokenConfig?: {
      requireMeToken: boolean;
      priceInMeToken: number;
    };
    storyConfig?: {
      registerIP: boolean;
      licenseTerms?: any;
    };
    nftMintResult?: {
      tokenId: string;
      contractAddress: string;
      txHash: string;
    };
  }) => Promise<void> | void;
}

export default function CreateThumbnailWrapper(props: CreateThumbnailWrapperProps) {
  return <CreateThumbnail {...props} />;
}
