"use client";

import { useState, useEffect, useCallback } from "react";
import {
  songCupSubmissionsService,
  type SongCupSubmission,
} from "@/lib/sdk/supabase/song-cup-submissions";
import { useSongCupAdmin } from "@/lib/hooks/song-cup/useSongCupAdmin";
import { logger } from "@/lib/utils/logger";

export function useSongCupSubmissions(enabled: boolean = true) {
  const { isAdmin, walletAddress, isLoading: isAdminLoading } = useSongCupAdmin();
  const [submissions, setSubmissions] = useState<SongCupSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!isAdmin || !enabled) {
      setSubmissions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const rows = await songCupSubmissionsService.list();
      setSubmissions(rows);
    } catch (err) {
      logger.error('[useSongCupSubmissions] fetch failed:', err);
      setError('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateStatus = useCallback(async (id: string, status: SongCupSubmission['status']) => {
    const ok = await songCupSubmissionsService.updateStatus(id, status);
    if (ok) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, updated_at: new Date().toISOString() } : s))
      );
    }
    return ok;
  }, []);

  const setFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    const ok = await songCupSubmissionsService.setFavorite(id, isFavorite);
    if (ok) {
      setSubmissions((prev) => {
        const next = prev.map((s) =>
          s.id === id
            ? {
                ...s,
                is_favorite: isFavorite,
                status: isFavorite ? "approved" : s.status,
                updated_at: new Date().toISOString(),
              }
            : s,
        );
        return [...next].sort((a, b) => {
          if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
          return Date.parse(b.created_at) - Date.parse(a.created_at);
        });
      });
    }
    return ok;
  }, []);

  return {
    submissions,
    isLoading,
    error,
    refetch: fetch,
    updateStatus,
    setFavorite,
    isAdmin,
    walletAddress,
    isAdminLoading,
  };
}
