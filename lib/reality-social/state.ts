import { supabaseService } from "@/lib/sdk/supabase/service";

export type ChainSyncState = {
  lastTimestamp: number;
  lastIndex: number;
};

export async function loadChainSyncState(chainId: number): Promise<ChainSyncState | null> {
  if (!supabaseService) return null;

  const { data, error } = await supabaseService
    .from("reality_social_sync_state")
    .select("last_timestamp, last_index")
    .eq("chain_id", chainId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    lastTimestamp: Number(data.last_timestamp),
    lastIndex: Number(data.last_index),
  };
}

export async function saveChainSyncState(
  chainId: number,
  state: ChainSyncState,
): Promise<void> {
  if (!supabaseService) {
    throw new Error("Supabase service client unavailable — cannot persist social sync state");
  }

  const { error } = await supabaseService.from("reality_social_sync_state").upsert(
    {
      chain_id: chainId,
      last_timestamp: state.lastTimestamp,
      last_index: state.lastIndex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chain_id" },
  );

  if (error) throw error;
}

export async function initializeChainSyncState(chainId: number): Promise<ChainSyncState> {
  const ts = Math.floor(Date.now() / 1000);
  const state = { lastTimestamp: ts, lastIndex: 0 };
  await saveChainSyncState(chainId, state);
  return state;
}
