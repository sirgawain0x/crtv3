"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/wallet/react";
import {
  hackBetaSubmissionsService,
  type HackBetaSubmission,
} from "@/lib/sdk/supabase/hack-beta-submissions";
import { logger } from "@/lib/utils/logger";

export function useHackBetaUserSubmission(walletAddress?: string | null) {
  const user = useUser();
  const address = walletAddress ?? user?.address ?? null;
  const [submission, setSubmission] = useState<HackBetaSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!address) {
      setSubmission(null);
      return;
    }
    setIsLoading(true);
    try {
      const row = await hackBetaSubmissionsService.getForWallet(address);
      setSubmission(row);
    } catch (err) {
      logger.error("[useHackBetaUserSubmission] failed:", err);
      setSubmission(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    submission,
    hasSubmitted: Boolean(submission),
    isLoading,
    setSubmission,
    reload,
  };
}
