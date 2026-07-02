"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@/lib/wallet/react";
import { songCupSubmissionsService, SongCupSubmission } from "@/lib/sdk/supabase/song-cup-submissions";
import { isSongCupAdminWallet } from "@/lib/songchain/song-cup/admin-config";
import { logger } from "@/lib/utils/logger";

export function useSongCupSubmissions(enabled: boolean = true) {
  const user = useUser();
  const [submissions, setSubmissions] = useState<SongCupSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(
    () => isSongCupAdminWallet(user?.address),
    [user?.address],
  );

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

  return { submissions, isLoading, error, refetch: fetch, updateStatus, isAdmin };
}
