"use server";
// services/video-assets.ts

import { createClient } from "@/lib/sdk/supabase/server";
import { createServiceClient } from "@/lib/sdk/supabase/service";
import type { VideoAsset } from "@/lib/types/video-asset";
import { fullLivepeer } from "@/lib/sdk/livepeer/fullClient";

export async function createVideoAsset(
  data: Omit<VideoAsset, "id" | "created_at" | "updated_at">
) {
  // Use service client to bypass RLS since we're using smart account addresses
  // which don't match Supabase JWT authentication
  const supabase = createServiceClient();
  
  const { data: result, error } = await supabase
    .from('video_assets')
    .insert({
      title: data.title,
      asset_id: data.asset_id,
      category: data.category,
      location: data.location,
      playback_id: data.playback_id,
      description: data.description,
      creator_id: data.creator_id,
      status: data.status,
      thumbnail_url: data.thumbnailUri,
      duration: data.duration,
      price: data.price,
      max_supply: data.max_supply,
      views_count: data.views_count || 0,
      likes_count: data.likes_count || 0,
      is_minted: data.is_minted || false,
      token_id: data.token_id,
      contract_address: data.contract_address,
      minted_at: data.minted_at,
      mint_transaction_hash: data.mint_transaction_hash,
      royalty_percentage: data.royalty_percentage,
      current_supply: data.current_supply || 0,
      metadata_uri: data.metadata_uri,
      attributes: data.attributes,
      requires_metoken: data.requires_metoken || false,
      metoken_price: data.metoken_price || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create video asset: ${error.message}`);
  }

  return result;
}

export async function getVideoAssetById(id: number) {
  const supabase = await createClient();
  
  const { data: result, error } = await supabase
    .from('video_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle(); // Use maybeSingle() instead of single()

  if (error) {
    throw new Error(`Failed to get video asset: ${error.message}`);
  }

  return result; // This will be null if no record found
}

export async function getVideoAssetByPlaybackId(playbackId: string) {
  const supabase = await createClient();
  
  const { data: result, error } = await supabase
    .from('video_assets')
    .select('id, status, thumbnail_url')
    .eq('playback_id', playbackId)
    .maybeSingle(); // Use maybeSingle() instead of single()

  if (error) {
    throw new Error(`Failed to get video asset by playback ID: ${error.message}`);
  }

  return result; // This will be null if no record found, or the single record if found
}

export async function getVideoAssetByAssetId(assetId: string) {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(assetId)) {
    throw new Error(`Invalid asset ID: ${assetId}. Asset ID must be a valid UUID.`);
  }
  
  const supabase = await createClient();
  
  const { data: result, error } = await supabase
    .from('video_assets')
    .select('*')
    .eq('asset_id', assetId)
    .maybeSingle(); // Use maybeSingle() instead of single()

  if (error) {
    throw new Error(`Failed to get video asset by asset ID: ${error.message}`);
  }

  return result; // This will be null if no record found
}

export async function updateVideoAssetMintingStatus(
  id: number,
  mintingData: {
    token_id: string;
    contract_address: string;
    mint_transaction_hash: string;
  }
) {
  // Use service client to bypass RLS
  const supabase = createServiceClient();
  
  const { data: result, error } = await supabase
    .from('video_assets')
    .update({
      is_minted: true,
      token_id: mintingData.token_id,
      contract_address: mintingData.contract_address,
      mint_transaction_hash: mintingData.mint_transaction_hash,
      minted_at: new Date().toISOString(),
      status: 'minted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update video asset minting status: ${error.message}`);
  }

  return result;
}

export async function updateVideoAsset(
  id: number,
  data: {
    thumbnailUri: string;
    status: string;
    max_supply?: number | null;
    price?: number | null;
    royalty_percentage?: number | null;
    metadata_uri?: string | null;
    requires_metoken?: boolean;
    metoken_price?: number | null;
  }
) {
  // Use service client to bypass RLS
  const supabase = createServiceClient();
  
  const updateData: any = {
    thumbnail_url: data.thumbnailUri,
    status: data.status,
    updated_at: new Date().toISOString(),
  };

  // Only include fields if they are provided
  if (data.max_supply !== undefined) {
    updateData.max_supply = data.max_supply;
  }
  if (data.price !== undefined) {
    updateData.price = data.price;
  }
  if (data.royalty_percentage !== undefined) {
    updateData.royalty_percentage = data.royalty_percentage;
  }
  if (data.metadata_uri !== undefined) {
    updateData.metadata_uri = data.metadata_uri;
  }
  if (data.requires_metoken !== undefined) {
    updateData.requires_metoken = data.requires_metoken;
  }
  if (data.metoken_price !== undefined) {
    updateData.metoken_price = data.metoken_price;
  }
  
  const { data: result, error } = await supabase
    .from('video_assets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update video asset: ${error.message}`);
  }

  return result;
}

export interface GetPublishedVideoAssetsOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'views_count' | 'likes_count' | 'updated_at';
  order?: 'asc' | 'desc';
  creatorId?: string;
  category?: string;
  search?: string;
}

/**
 * Fetch published video assets from Supabase with advanced filtering and search
 * This is the primary function for retrieving videos at scale
 */
export async function getPublishedVideoAssets(options: GetPublishedVideoAssetsOptions = {}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('video_assets')
    .select('*', { count: 'exact' })
    .eq('status', 'published');
  
  // Add creator filter if specified
  if (options.creatorId) {
    query = query.eq('creator_id', options.creatorId);
  }
  
  // Add category filter if specified
  if (options.category) {
    query = query.eq('category', options.category);
  }
  
  // Add full-text search if specified (searches title and description)
  if (options.search && options.search.trim()) {
    // Use text search across title and description
    const searchTerm = options.search.trim();
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }
  
  // Add ordering
  const orderBy = options.orderBy || 'created_at';
  const order = options.order || 'desc';
  query = query.order(orderBy, { ascending: order === 'asc' });
  
  // Add pagination
  if (options.limit) {
    const offset = options.offset || 0;
    query = query.range(offset, offset + options.limit - 1);
  }
  
  const { data, error, count } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch published videos: ${error.message}`);
  }
  
  return { 
    data: data || [], 
    total: count || 0,
    hasMore: options.limit ? (count || 0) > (options.offset || 0) + (options.limit || 0) : false
  };
}

export interface MultistreamTarget {
  id?: string;
  name?: string;
  url?: string; // Not in SDK, but we use it for UI
  createdAt?: number;
  userId?: string;
  disabled?: boolean;
}

export interface CreateMultistreamTargetParams {
  streamId: string;
  name: string;
  url: string;
  profile?: string;
  videoOnly?: boolean;
}

export interface CreateMultistreamTargetResult {
  target?: MultistreamTarget;
  error?: string;
}

export async function createMultistreamTarget({
  streamId,
  name,
  url,
  profile = "720p0",
  videoOnly = false,
}: CreateMultistreamTargetParams): Promise<CreateMultistreamTargetResult> {
  if (!streamId || !url) {
    return { error: "Missing streamId or URL" };
  }
  
  // Name is optional - provide default if not given
  const targetName = name || `Target ${Date.now()}`;
  
  try {
    const target = await fullLivepeer.stream.addMultistreamTarget(
      {
        profile,
        videoOnly,
        spec: { name: targetName, url },
      },
      streamId
    );
    
    if (!target) {
      return { error: "Failed to create multistream target" };
    }
    
    return { target: { ...target, url, name: targetName } };
  } catch (e: any) {
    console.error("Error creating multistream target:", e);
    return { 
      error: e?.message || "Failed to create multistream target" 
    };
  }
}

export interface ListMultistreamTargetsResult {
  targets?: MultistreamTarget[];
  error?: string;
}

export interface ListMultistreamTargetsParams {
  streamId: string;
}

/**
 * Lists multistream targets for a specific stream.
 * According to Livepeer docs, multistream targets are stream-specific.
 * 
 * @param streamId - The Livepeer stream ID to fetch targets for
 * @returns List of multistream targets for the specified stream
 */
export async function listMultistreamTargets(
  { streamId }: ListMultistreamTargetsParams
): Promise<ListMultistreamTargetsResult> {
  if (!streamId) {
    return { error: "Stream ID is required" };
  }
  
  try {
    // Fetch the stream to get its multistream targets
    const stream = await fullLivepeer.stream.get(streamId);
    
    if (!stream || !stream.stream) {
      return { error: "Stream not found" };
    }
    
    // Extract multistream targets from the stream object
    // Livepeer API returns targets in stream.multistream.targets
    const targets = stream.stream.multistream?.targets || [];
    
    if (!Array.isArray(targets)) {
      return { error: "Invalid multistream targets format" };
    }
    
    return { targets: targets as MultistreamTarget[] };
  } catch (e: any) {
    console.error("Error fetching multistream targets:", e);
    return { 
      error: e?.message || "Failed to fetch multistream targets" 
    };
  }
}

export interface DeleteMultistreamTargetParams {
  id: string;
}

export interface DeleteMultistreamTargetResult {
  success: boolean;
  error?: string;
}

export async function deleteMultistreamTarget({
  id,
}: DeleteMultistreamTargetParams): Promise<DeleteMultistreamTargetResult> {
  if (!id) return { success: false, error: "Missing target ID" };
  try {
    await fullLivepeer.multistream.delete(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete multistream target" };
  }
}

