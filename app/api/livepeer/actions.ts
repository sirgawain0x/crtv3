'use server';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import {
  Asset,
  NewAssetFromUrlPayload,
  NewAssetPayload,
} from 'livepeer/models/components';

// FETCH ALL ASSETS
export const fetchAllAssets = async (): Promise<Asset[] | {}> => {
  try {
    const assets =  await fullLivepeer.asset.getAll();
    return assets.data as Asset[];
  } catch (error) {
    console.error('Error fetching assets:', error);
    return {};
  }
};

// FETCH ASSET BY ID
export const fetchAssetId = async (
  id: string | { queryKey: [unknown, { assetId: string }] },
) => {
  let assetId: string;
  
  if (typeof id === 'string') {
    // Handle the case where `id` is a string
    assetId = id;
  } else {
    // Handle the case where `id` is an object with a `queryKey` property
    const [, { assetId: queryAssetId }] = id.queryKey;
    assetId = queryAssetId;
  }
  
  const asset = await fullLivepeer?.asset.get(assetId);
  
  return asset;
};

// UPDATE ASSET BY ID
export const updateAsset = async (
  id: string | { queryKey: [unknown, { assetId: string }] },
  data: any,
) => {
  let assetId: string;
  
  if (typeof id === 'string') {
    // Handle the case where `id` is a string
    assetId = id;
  } else {
    // Handle the case where `id` is an object with a `queryKey` property
    const [, { assetId: queryAssetId }] = id.queryKey;
    assetId = queryAssetId;
  }
  
  const asset = await fullLivepeer?.asset.update(data, assetId);

  return asset;
};

// CREATE ASSET
export const createAsset = async (data: NewAssetPayload) => {
  try {
    const asset = await fullLivepeer?.asset.create(data);
    return [asset];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to create asset: ${errorMessage}`);
  }
};

// CREATE ASSET VIA URL
export const createViaUrl = async (data: NewAssetFromUrlPayload) => {
  try {
    const asset = await fullLivepeer?.asset?.createViaUrl(data);
    return [asset];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Error creating url: ${errorMessage}`);
  }
};

// DELETE ASSET BY ID
export const deleteAsset = async (
  id: string | { queryKey: [unknown, { assetId: string }] },
) => {
  let assetId: string;

  if (typeof id === 'object') {
    // Handle the case where `id` is an object with a `queryKey` property
    const [, { assetId: queryAssetId }] = id.queryKey;
    assetId = queryAssetId;
  } else {
    // Handle the case where `id` is a string
    assetId = id;
  }

  const response = await fullLivepeer?.asset.delete(assetId);
  
  const asset = response;
  
  return asset;
};
