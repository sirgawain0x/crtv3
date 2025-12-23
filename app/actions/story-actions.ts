'use server';

import { createServiceClient } from '@/lib/sdk/supabase/service';
import type { Address } from 'viem';

/**
 * Get a creator's collection address from the database
 */
export async function getCreatorCollectionAction(creatorAddress: Address) {
    const supabase = createServiceClient();

    const { data } = await supabase
        .from('creator_collections')
        .select('collection_address')
        .eq('creator_id', creatorAddress)
        .single();

    return data?.collection_address as Address | null;
}

/**
 * Save a new creator collection to the database
 */
export async function saveCreatorCollectionAction(
    creatorAddress: Address,
    collectionAddress: Address,
    collectionName: string,
    collectionSymbol: string
) {
    const supabase = createServiceClient();

    const { error } = await supabase
        .from('creator_collections')
        .upsert(
            {
                creator_id: creatorAddress,
                collection_address: collectionAddress,
                collection_name: collectionName,
                collection_symbol: collectionSymbol,
                created_at: new Date().toISOString(),
            },
            {
                onConflict: 'creator_id',
            }
        );

    if (error) {
        console.error('Failed to save creator collection:', error);
        throw new Error(`Failed to save collection: ${error.message}`);
    }
}
