/**
 * Subtitle chunk type - represents a single subtitle entry with text and timing
 */
export type Chunk = {
  text: string;
  timestamp: number[];
};

/**
 * Subtitles type - maps language codes to arrays of subtitle chunks
 * Example: { "English": [{text: "Hello", timestamp: [0, 2]}], "Spanish": [...] }
 */
export type Subtitles = Record<string, Chunk[]>;

export interface VideoAsset {
  id: number;
  title: string;
  asset_id: string;
  category: string;
  location: string;
  playback_id: string;
  description: string | null;
  thumbnailUri: string;
  creator_id: string;
  status: "draft" | "published" | "minted" | "archived";
  duration: number | null;
  views_count: number;
  likes_count: number;
  is_minted: boolean;
  token_id: string | null;
  contract_address: string | null;
  minted_at: Date | null;
  mint_transaction_hash: string | null;
  royalty_percentage: number | null;
  price: number | null;
  max_supply: number | null;
  current_supply: number;
  metadata_uri: string | null;
  attributes: Record<string, any> | null;
  requires_metoken: boolean;
  metoken_price: number | null;
  // Subtitle fields
  subtitles_uri: string | null;  // IPFS URI for decentralized storage
  subtitles: Subtitles | null;    // Cached JSONB data for fast access
  created_at: Date;
  updated_at: Date;
}

export interface NFTConfig {
  isMintable: boolean;
  maxSupply: number;
  price: number;
  royaltyPercentage: number;
}
