"use client";

import { useState, useEffect, useCallback } from "react";
import { songCupSubmissionsService, SongCupSubmission } from "@/lib/sdk/supabase/song-cup-submissions";
import { logger } from "@/lib/utils/logger";

export function useSongCupSubmissions() {
  const [submissions, setSubmissions] = useState<SongCupSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
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
  }, []);

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

  return { submissions, isLoading, error, refetch: fetch, updateStatus };
}
