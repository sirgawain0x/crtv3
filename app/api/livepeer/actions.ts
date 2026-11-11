"use server";
import {
  FrameWorksUploadsAssetsUnavailableError,
  requireVideoProviderForUploadsAndAssets,
} from "@/lib/video-provider";
import {
  Asset,
  NewAssetFromUrlPayload,
  NewAssetPayload,
} from "livepeer/models/components";
import { serverLogger } from "@/lib/utils/logger";

// FETCH ALL ASSETS
export const fetchAllAssets = async (options?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: Asset[]; total: number }> => {
  try {
    const limit = options?.limit || 20; // Default to 20 items per page
    const offset = options?.offset || 0;
    
    // The Livepeer SDK's getAll() method retrieves all assets
    const response = (await requireVideoProviderForUploadsAndAssets(
      "actions.fetchAllAssets",
    ).assets.getAll()) as {
      data?: Asset[];
    };

    const allAssets = response.data ?? [];
    
    // Implement client-side pagination
    const paginatedData = allAssets.slice(offset, offset + limit);
    
    return {
      data: paginatedData,
      total: allAssets.length,
    };
  } catch (error) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) throw error;
    serverLogger.error("Error fetching assets:", error);
    throw new Error(
      `Failed to fetch assets: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// FETCH ASSET BY ID
export const fetchAssetId = async (
  id: string | { queryKey: [unknown, { assetId: string }] }
) => {
  try {
    let assetId: string;

    if (typeof id === "string") {
      // Handle the case where `id` is a string
      assetId = id;
    } else {
      // Handle the case where `id` is an object with a `queryKey` property
      const [, { assetId: queryAssetId }] = id.queryKey;
      assetId = queryAssetId;
    }

    const asset = (await requireVideoProviderForUploadsAndAssets(
      "actions.fetchAssetId",
    ).assets.getById(assetId)) as {
      asset?: Asset;
    } | null;

    return asset;
  } catch (error) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) throw error;
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Fetch asset by ID failed, unknown error occurred";
    throw new Error(`Failed to fetch asset by ID: ${errorMessage}`);
  }
};

// UPDATE ASSET BY ID
export const updateAsset = async (
  id: string | { queryKey: [unknown, { assetId: string }] },
  data: any
) => {
  try {
    let assetId: string;

    if (typeof id === "string") {
      // Handle the case where `id` is a string
      assetId = id;
    } else {
      // Handle the case where `id` is an object with a `queryKey` property
      const [, { assetId: queryAssetId }] = id.queryKey;
      assetId = queryAssetId;
    }

    const asset = await requireVideoProviderForUploadsAndAssets(
      "actions.updateAsset",
    ).assets.update(data, assetId);

    return asset;
  } catch (error: unknown) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) throw error;
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Update asset ailed, unknown error occurred";
    throw new Error(`Failed to update asset: ${errorMessage}`);
  }
};

// CREATE ASSET
export const createAsset = async (data: NewAssetPayload) => {
  try {
    const asset = await requireVideoProviderForUploadsAndAssets(
      "actions.createAsset",
    ).assets.create(data);
    return [asset];
  } catch (error: unknown) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) throw error;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to create asset: ${errorMessage}`);
  }
};

// CREATE ASSET VIA URL
export const createViaUrl = async (data: NewAssetFromUrlPayload) => {
  try {
    const asset = await requireVideoProviderForUploadsAndAssets(
      "actions.createViaUrl",
    ).assets.createViaUrl(data);
    return [asset];
  } catch (error: unknown) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) throw error;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error creating url: ${errorMessage}`);
  }
};

// DELETE ASSET BY ID
export const deleteAsset = async (
  id: string | { queryKey: [unknown, { assetId: string }] }
) => {
  try {
    let assetId: string;

    if (typeof id === "object") {
      // Handle the case where `id` is an object with a `queryKey` property
      const [, { assetId: queryAssetId }] = id.queryKey;
      assetId = queryAssetId;
    } else {
      // Handle the case where `id` is a string
      assetId = id;
    }

    await requireVideoProviderForUploadsAndAssets(
      "actions.deleteAsset",
    ).assets.delete(assetId);
    return { assetId, deleted: true };
  } catch (error) {
    if (error instanceof FrameWorksUploadsAssetsUnavailableError) throw error;
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Delete asset failed, unknown error occurred";
    throw new Error(`Failed to delete asset: ${errorMessage}`);
  }
};
