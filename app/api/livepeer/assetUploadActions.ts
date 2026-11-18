"use server";

import {
  Type,
  InputCreatorIdType,
  type Asset,
} from "livepeer/models/components";
import {
  FrameWorksUploadsAssetsUnavailableError,
  requireVideoProviderForUploadsAndAssets,
} from "@/lib/video-provider";
import { WebhookContext } from "./token-gate/route";
import { serverLogger } from "@/lib/utils/logger";
import {
  type WalletAuthArgs,
  WalletAuthError,
} from "@/lib/auth/require-wallet";
import {
  maybeMintUploadSessionTicket,
  requireUploadCreatorWallet,
  requireUploadSessionOwner,
} from "@/lib/video-provider/upload-session-auth";

export type LivepeerUploadSession = {
  asset?: Asset;
  tusEndpoint?: string;
  uploadId?: string;
  partSize?: number;
  uploadTicket?: string;
  presignedParts?: Array<{ partNumber?: number; url?: string }>;
};

export type UploadActionError = {
  status: number;
  message: string;
};

function toUploadActionError(err: unknown): never {
  if (err instanceof WalletAuthError) {
    throw Object.assign(new Error(err.message), {
      name: "WalletAuthError",
      status: err.status,
    });
  }
  throw err;
}

export const getLivepeerUploadUrl = async (
  auth: WalletAuthArgs,
  fileName: string,
  _creatorAddress: string,
  sizeBytes: number,
  tokenId?: string,
  contractAddress?: string,
  tokenGated: boolean = false,
  fileMeta?: { filename?: string; contentType?: string },
): Promise<LivepeerUploadSession | undefined> => {
  let creatorAddress: string;
  try {
    creatorAddress = await requireUploadCreatorWallet(auth);
  } catch (err) {
    toUploadActionError(err);
  }

  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("sizeBytes is required and must be a positive number");
  }

  const createAssetBody: {
    name: string;
    sizeBytes: number;
    filename?: string;
    contentType?: string;
    storage: {
      ipfs: boolean;
    };
    creatorId: {
      type: InputCreatorIdType;
      value: string;
    };
    staticMp4?: boolean;
    playbackPolicy?: {
      type: Type;
      webhookId: string;
      webhookContext: WebhookContext;
    };
  } = {
    name: fileName,
    sizeBytes,
    filename: fileMeta?.filename ?? fileName,
    contentType: fileMeta?.contentType,
    storage: {
      ipfs: true,
    },
    creatorId: {
      type: InputCreatorIdType?.Unverified,
      value: creatorAddress,
    },
    staticMp4: true,
  };

  if (tokenGated) {
    if (!tokenId) throw new Error("Token ID is required for token gated assets");
    if (!contractAddress) {
      throw new Error("Token contract address is required for token gated assets");
    }

    createAssetBody.playbackPolicy = {
      type: Type.Webhook,
      webhookId: process.env.LIVEPEER_WEBHOOK_ID as string,
      webhookContext: {
        creatorAddress,
        tokenId,
        contractAddress,
      } as WebhookContext,
    };
  }

  try {
    const result = (await requireVideoProviderForUploadsAndAssets(
      "assetUploadActions.getLivepeerUploadUrl",
    ).assets.create(createAssetBody)) as {
      data?: LivepeerUploadSession;
    };

    const session = result.data as LivepeerUploadSession | undefined;
    if (!session) return session;

    const uploadId = session.uploadId?.trim();
    const uploadTicket = uploadId
      ? maybeMintUploadSessionTicket(uploadId, creatorAddress)
      : undefined;

    return {
      ...session,
      uploadTicket,
    };
  } catch (err) {
    toUploadActionError(err);
  }
};

export const abortFrameworksVodUpload = async (
  auth: WalletAuthArgs,
  uploadId: string,
  uploadTicket: string,
): Promise<void> => {
  try {
    await requireUploadSessionOwner(auth, uploadId, uploadTicket);
  } catch (err) {
    toUploadActionError(err);
  }

  const assets = requireVideoProviderForUploadsAndAssets(
    "assetUploadActions.abortFrameworksVodUpload",
  ).assets as {
    abortUpload?: (id: string) => Promise<void>;
  };
  if (typeof assets.abortUpload !== "function") {
    return;
  }
  await assets.abortUpload(uploadId);
};

export const completeFrameworksVodUpload = async (
  auth: WalletAuthArgs,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>,
  uploadTicket: string,
) => {
  try {
    await requireUploadSessionOwner(auth, uploadId, uploadTicket);
  } catch (err) {
    toUploadActionError(err);
  }

  const assets = requireVideoProviderForUploadsAndAssets(
    "assetUploadActions.completeFrameworksVodUpload",
  ).assets as {
    completeUpload?: (body: unknown) => Promise<unknown>;
  };

  if (typeof assets.completeUpload !== "function") {
    throw new Error("completeUpload is only available with FrameWorks");
  }

  return assets.completeUpload({ uploadId, parts });
};

export const getLivepeerAsset = async (
  livePeerAssetId: string,
): Promise<Asset> => {
  try {
    if (!livePeerAssetId) {
      throw new Error("Asset ID is required");
    }

    const result = (await requireVideoProviderForUploadsAndAssets(
      "assetUploadActions.getLivepeerAsset",
    ).assets.getById(livePeerAssetId)) as {
      asset?: unknown;
    } | null;

    if (!result?.asset) {
      serverLogger.error("No asset found in result:", result);
      throw new Error("Asset not found or invalid response from Livepeer");
    }

    return result.asset as Asset;
  } catch (error: unknown) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) throw error;
    const err = error as { message?: string; statusCode?: number };
    serverLogger.error("Error fetching Livepeer asset:", {
      assetId: livePeerAssetId,
      error: err?.message,
      statusCode: err?.statusCode,
    });
    throw new Error(err?.message || "Failed to fetch video asset");
  }
};

export const getLivepeerPlaybackInfo = async (playbackId: string) => {
  const result = await requireVideoProviderForUploadsAndAssets(
    "assetUploadActions.getLivepeerPlaybackInfo",
  ).playback.get(playbackId);
  return result.playbackInfo as import("livepeer/models/components").PlaybackInfo | undefined;
};