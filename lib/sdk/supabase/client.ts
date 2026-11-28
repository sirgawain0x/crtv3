import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

function readSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    // Thrown on first use, not at import: a build must not need credentials.
    throw new Error('Missing Supabase environment variables');
  }
  return { url, anonKey };
}

let browserClient: SupabaseClient | undefined;

function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const { url, anonKey } = readSupabaseEnv();
    browserClient = createBrowserClient(url, anonKey);
  }
  return browserClient;
}

// Create client-side Supabase client on first use. A Proxy keeps `supabase.from(...)`
// working at every existing call site while deferring the env check to runtime.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getBrowserClient() as unknown as Record<string | symbol, unknown>;
    const value = client[property];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

// Types for our MeToken tables
export interface MeToken {
  id: string;
  address: string;
  owner_address: string;
  name: string;
  symbol: string;
  total_supply: number;
  tvl: number;
  hub_id: number;
  balance_pooled: number;
  balance_locked: number;
  start_time?: string;
  end_time?: string;
  end_cooldown?: string;
  target_hub_id?: number;
  migration_address?: string;
  created_at: string;
  updated_at: string;
}

export interface MeTokenBalance {
  id: string;
  metoken_id: string;
  user_address: string;
  balance: number;
  updated_at: string;
  metoken?: MeToken; // Joined data
}

export interface MeTokenTransaction {
  id: string;
  metoken_id: string;
  user_address: string;
  transaction_type: 'mint' | 'burn' | 'transfer' | 'create';
  amount: number;
  collateral_amount?: number;
  transaction_hash?: string;
  block_number?: number;
  created_at: string;
}

export interface CreateMeTokenData {
  address: string;
  owner_address: string;
  name: string;
  symbol: string;
  total_supply: number;
  tvl?: number;
  hub_id: number;
  balance_pooled?: number;
  balance_locked?: number;
  start_time?: string;
  end_time?: string;
  end_cooldown?: string;
  target_hub_id?: number;
  migration_address?: string;
}

export interface UpdateMeTokenData {
  total_supply?: number;
  tvl?: number;
  balance_pooled?: number;
  balance_locked?: number;
  end_time?: string;
  end_cooldown?: string;
}

import type { CreatorXmerchProfile } from "@/lib/creator/xmerch-profile";

// Types for Creator Profiles (replacing OrbisDB metadata)
export interface CreatorProfile {
  id: string;
  owner_address: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  twin_enabled?: boolean;
  twin_address?: string | null;
  twin_avatar_glb_url?: string | null;
  twin_chat_endpoint?: string | null;
  twin_pinata_agent_id?: string | null;
  twin_pinata_snapshot_cid?: string | null;
  twin_pinata_agent_name?: string | null;
  twin_pinata_connected_at?: string | null;
  // twin_pinata_gateway_token deliberately omitted from client-readable type;
  // it's column-locked to service-role reads.
  orb_account_id?: string | null;
  lens_account_id?: string | null;
  lens_handle?: string | null;
  lens_avatar_uri?: string | null;
  /** Brand channel slug (chones, spindrift, songchain) when linked by a Brand Pass holder */
  brand_channel_slug?: string | null;
  social_orb_url?: string | null;
  social_instagram_url?: string | null;
  social_x_url?: string | null;
  /** Invite-only Creative Merch (admin-set JSON); public UI when enabled is true */
  social_xmerch?: CreatorXmerchProfile | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCreatorProfileData {
  owner_address: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  twin_enabled?: boolean;
  twin_address?: string | null;
  twin_avatar_glb_url?: string | null;
  twin_chat_endpoint?: string | null;
  orb_account_id?: string | null;
  lens_account_id?: string | null;
  lens_handle?: string | null;
  lens_avatar_uri?: string | null;
  brand_channel_slug?: string | null;
  social_orb_url?: string | null;
  social_instagram_url?: string | null;
  social_x_url?: string | null;
}

export interface UpdateCreatorProfileData {
  username?: string;
  bio?: string;
  avatar_url?: string;
  twin_enabled?: boolean;
  twin_address?: string | null;
  twin_avatar_glb_url?: string | null;
  twin_chat_endpoint?: string | null;
  orb_account_id?: string | null;
  lens_account_id?: string | null;
  lens_handle?: string | null;
  lens_avatar_uri?: string | null;
  brand_channel_slug?: string | null;
  social_orb_url?: string | null;
  social_instagram_url?: string | null;
  social_x_url?: string | null;
}

// Types for Song Cup submissions
export interface SongCupSubmissionRow {
  id: string;
  wallet_address: string;
  grove_url: string;
  grove_hash?: string | null;
  title?: string | null;
  description?: string | null;
  post_id?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string | null;
}
