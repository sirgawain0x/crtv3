"use client";

import { useState, useEffect, useCallback } from "react";
import {
  hackBetaSettingsService,
  type HackBetaSettings,
} from "@/lib/sdk/supabase/hack-beta-settings";
import { logger } from "@/lib/utils/logger";

export function useHackBetaSettings() {
  const [settings, setSettings] = useState<HackBetaSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const row = await hackBetaSettingsService.get();
      setSettings(row);
    } catch (err) {
      logger.error("[useHackBetaSettings] failed:", err);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const updateMixtapeUrl = useCallback(
    async (url: string | null, updatedBy?: string | null) => {
      const row = await hackBetaSettingsService.updateMixtapeUrl(url, updatedBy);
      if (row) setSettings(row);
      return row;
    },
    [],
  );

  return {
    settings,
    mixtapePlaylistUrl: settings?.mixtape_playlist_url ?? null,
    isLoading,
    refetch,
    updateMixtapeUrl,
  };
}
