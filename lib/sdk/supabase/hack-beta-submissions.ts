import { supabase } from './client';
import { serverLogger } from '@/lib/utils/logger';

export interface HackBetaSubmission {
  id: string;
  wallet_address: string;
  video_asset_id: string;
  title?: string | null;
  description?: string | null;
  playback_id?: string | null;
  thumbnail_url?: string | null;
  grove_url?: string | null;
  grove_hash?: string | null;
  is_favorite: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string | null;
}

export interface CreateHackBetaSubmissionData {
  wallet_address: string;
  video_asset_id: string;
  title?: string;
  description?: string;
  playback_id?: string;
  thumbnail_url?: string;
  grove_url?: string;
  grove_hash?: string;
}

export type CreateHackBetaSubmissionResult =
  | { ok: true; submission: HackBetaSubmission }
  | { ok: false; reason: 'duplicate' | 'error'; message?: string };

export const hackBetaSubmissionsService = {
  async getForWallet(walletAddress: string): Promise<HackBetaSubmission | null> {
    try {
      const normalized = walletAddress.toLowerCase();
      const { data, error } = await supabase
        .from('hack_beta_submissions')
        .select('*')
        .eq('wallet_address', normalized)
        .maybeSingle();

      if (error) {
        serverLogger.error('[hackBetaSubmissions] getForWallet error:', error);
        return null;
      }

      return (data as HackBetaSubmission | null) ?? null;
    } catch (err) {
      serverLogger.error('[hackBetaSubmissions] getForWallet exception:', err);
      return null;
    }
  },

  async create(data: CreateHackBetaSubmissionData): Promise<CreateHackBetaSubmissionResult> {
    try {
      const existing = await hackBetaSubmissionsService.getForWallet(data.wallet_address);
      if (existing) {
        return { ok: false, reason: 'duplicate', message: 'You already submitted an entry.' };
      }

      const { data: row, error } = await supabase
        .from('hack_beta_submissions')
        .insert({
          wallet_address: data.wallet_address.toLowerCase(),
          video_asset_id: data.video_asset_id,
          title: data.title ?? null,
          description: data.description ?? null,
          playback_id: data.playback_id ?? null,
          thumbnail_url: data.thumbnail_url ?? null,
          grove_url: data.grove_url ?? null,
          grove_hash: data.grove_hash ?? null,
          status: 'pending',
          is_favorite: false,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          return { ok: false, reason: 'duplicate', message: 'You already submitted an entry.' };
        }
        serverLogger.error('[hackBetaSubmissions] insert error:', error);
        return { ok: false, reason: 'error', message: error.message };
      }

      return { ok: true, submission: row as HackBetaSubmission };
    } catch (err) {
      serverLogger.error('[hackBetaSubmissions] create exception:', err);
      return {
        ok: false,
        reason: 'error',
        message: err instanceof Error ? err.message : undefined,
      };
    }
  },

  async list(): Promise<HackBetaSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('hack_beta_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        serverLogger.error('[hackBetaSubmissions] list error:', error);
        return [];
      }

      return (data ?? []) as HackBetaSubmission[];
    } catch (err) {
      serverLogger.error('[hackBetaSubmissions] list exception:', err);
      return [];
    }
  },

  async listApproved(): Promise<HackBetaSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('hack_beta_submissions')
        .select('*')
        .eq('status', 'approved')
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        serverLogger.error('[hackBetaSubmissions] listApproved error:', error);
        return [];
      }

      return (data ?? []) as HackBetaSubmission[];
    } catch (err) {
      serverLogger.error('[hackBetaSubmissions] listApproved exception:', err);
      return [];
    }
  },

  async updateStatus(id: string, status: HackBetaSubmission['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('hack_beta_submissions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        serverLogger.error('[hackBetaSubmissions] updateStatus error:', error);
        return false;
      }

      return true;
    } catch (err) {
      serverLogger.error('[hackBetaSubmissions] updateStatus exception:', err);
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
        .from('hack_beta_submissions')
        .update(updates)
        .eq('id', id);

      if (error) {
        serverLogger.error('[hackBetaSubmissions] setFavorite error:', error);
        return false;
      }

      return true;
    } catch (err) {
      serverLogger.error('[hackBetaSubmissions] setFavorite exception:', err);
      return false;
    }
  },
};
