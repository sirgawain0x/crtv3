import { supabase } from './client';
import { serverLogger } from '@/lib/utils/logger';

export interface SongCupSubmission {
  id: string;
  wallet_address: string;
  grove_url: string;
  grove_hash?: string | null;
  title?: string | null;
  description?: string | null;
  artist_handle?: string | null;
  email?: string | null;
  cover_url?: string | null;
  cover_hash?: string | null;
  attestation_uid?: string | null;
  post_id?: string | null;
  is_favorite: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string | null;
}

export interface CreateSongCupSubmissionData {
  wallet_address: string;
  grove_url: string;
  grove_hash?: string;
  title?: string;
  description?: string;
  artist_handle?: string;
  email?: string;
  cover_url?: string;
  cover_hash?: string;
  attestation_uid?: string;
  post_id?: string;
}

export type CreateSongCupSubmissionResult =
  | { ok: true; submission: SongCupSubmission }
  | { ok: false; reason: "duplicate" | "error"; message?: string };

export const songCupSubmissionsService = {
  async getForWallet(walletAddress: string): Promise<SongCupSubmission | null> {
    try {
      const normalized = walletAddress.toLowerCase();
      const { data, error } = await supabase
        .from("song_cup_submissions")
        .select("*")
        .eq("wallet_address", normalized)
        .maybeSingle();

      if (error) {
        serverLogger.error("[songCupSubmissions] getForWallet error:", error);
        return null;
      }

      return (data as SongCupSubmission | null) ?? null;
    } catch (err) {
      serverLogger.error("[songCupSubmissions] getForWallet exception:", err);
      return null;
    }
  },

  async create(data: CreateSongCupSubmissionData): Promise<CreateSongCupSubmissionResult> {
    try {
      const existing = await songCupSubmissionsService.getForWallet(data.wallet_address);
      if (existing) {
        return { ok: false, reason: "duplicate", message: "You already submitted an entry." };
      }

      const { data: row, error } = await supabase
        .from('song_cup_submissions')
        .insert({
          wallet_address: data.wallet_address.toLowerCase(),
          grove_url: data.grove_url,
          grove_hash: data.grove_hash ?? null,
          title: data.title ?? null,
          description: data.description ?? null,
          artist_handle: data.artist_handle ?? null,
          email: data.email ?? null,
          cover_url: data.cover_url ?? null,
          cover_hash: data.cover_hash ?? null,
          attestation_uid: data.attestation_uid ?? null,
          post_id: data.post_id ?? null,
          status: 'pending',
          is_favorite: false,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === "23505") {
          return { ok: false, reason: "duplicate", message: "You already submitted an entry." };
        }
        serverLogger.error('[songCupSubmissions] insert error:', error);
        return { ok: false, reason: "error", message: error.message };
      }

      return { ok: true, submission: row as SongCupSubmission };
    } catch (err) {
      serverLogger.error('[songCupSubmissions] create exception:', err);
      return {
        ok: false,
        reason: "error",
        message: err instanceof Error ? err.message : undefined,
      };
    }
  },

  async list(): Promise<SongCupSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('song_cup_submissions')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        serverLogger.error('[songCupSubmissions] list error:', error);
        return [];
      }

      return (data ?? []) as SongCupSubmission[];
    } catch (err) {
      serverLogger.error('[songCupSubmissions] list exception:', err);
      return [];
    }
  },

  async updateStatus(id: string, status: SongCupSubmission['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('song_cup_submissions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        serverLogger.error('[songCupSubmissions] updateStatus error:', error);
        return false;
      }

      return true;
    } catch (err) {
      serverLogger.error('[songCupSubmissions] updateStatus exception:', err);
      return false;
    }
  },

  async setFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    try {
      const updates: Record<string, unknown> = {
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      };
      if (isFavorite) {
        updates.status = 'approved';
      }

      const { error } = await supabase
        .from('song_cup_submissions')
        .update(updates)
        .eq('id', id);

      if (error) {
        serverLogger.error('[songCupSubmissions] setFavorite error:', error);
        return false;
      }

      return true;
    } catch (err) {
      serverLogger.error('[songCupSubmissions] setFavorite exception:', err);
      return false;
    }
  },
};
