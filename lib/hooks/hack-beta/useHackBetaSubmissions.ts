"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@/lib/wallet/react";
import {
  hackBetaSubmissionsService,
  type HackBetaSubmission,
} from "@/lib/sdk/supabase/hack-beta-submissions";
import { isHackBetaAdminWallet } from "@/lib/chones/hack-beta/admin-config";
import { logger } from "@/lib/utils/logger";

export function useHackBetaSubmissions(enabled: boolean = true) {
  const user = useUser();
  const [submissions, setSubmissions] = useState<HackBetaSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(
    () => isHackBetaAdminWallet(user?.address),
    [user?.address],
  );

  const fetchRows = useCallback(async () => {
    if (!isAdmin || !enabled) {
      setSubmissions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const rows = await hackBetaSubmissionsService.list();
      setSubmissions(rows);
    } catch (err) {
      logger.error("[useHackBetaSubmissions] fetch failed:", err);
      setError("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, enabled]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const updateStatus = useCallback(
    async (id: string, status: HackBetaSubmission["status"]) => {
      const ok = await hackBetaSubmissionsService.updateStatus(id, status);
      if (ok) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status, updated_at: new Date().toISOString() } : s,
          ),
        );
      }
      return ok;
    },
    [],
  );

  const setFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    const ok = await hackBetaSubmissionsService.setFavorite(id, isFavorite);
    if (ok) {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                is_favorite: isFavorite,
                status: isFavorite ? "approved" : s.status,
                updated_at: new Date().toISOString(),
              }
            : s,
        ),
      );
    }
    return ok;
  }, []);

  return {
    submissions,
    isLoading,
    error,
    refetch: fetchRows,
    updateStatus,
    setFavorite,
    isAdmin,
  };
}
