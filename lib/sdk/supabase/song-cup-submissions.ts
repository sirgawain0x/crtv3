import { supabase } from './client';
import { serverLogger } from '@/lib/utils/logger';

export interface SongCupSubmission {
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

export interface CreateSongCupSubmissionData {
  wallet_address: string;
  grove_url: string;
  grove_hash?: string;
  title?: string;
  description?: string;
  post_id?: string;
}

export const songCupSubmissionsService = {
  async create(data: CreateSongCupSubmissionData): Promise<SongCupSubmission | null> {
    try {
      const { data: row, error } = await supabase
        .from('song_cup_submissions')
        .insert({
          wallet_address: data.wallet_address.toLowerCase(),
          grove_url: data.grove_url,
          grove_hash: data.grove_hash ?? null,
          title: data.title ?? null,
          description: data.description ?? null,
          post_id: data.post_id ?? null,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error) {
        serverLogger.error('[songCupSubmissions] insert error:', error);
        return null;
      }

      return row as SongCupSubmission;
    } catch (err) {
      serverLogger.error('[songCupSubmissions] create exception:', err);
      return null;
    }
  },

  async list(): Promise<SongCupSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('song_cup_submissions')
        .select('*')
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
};
