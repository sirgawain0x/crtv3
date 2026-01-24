"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseNftMintingConfiguredResult {
  configured: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Check if Story Protocol NFT minting is configured (STORY_PROTOCOL_PRIVATE_KEY set).
 * Used by the upload flow to hide or show the NFT minting step.
 */
export function useNftMintingConfigured(): UseNftMintingConfiguredResult {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigured = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/story/mint-configured");
      const data = await res.json();
      if (!res.ok) {
        setConfigured(false);
        setError(data.error ?? "Failed to check NFT minting config");
        return;
      }
      setConfigured(!!data.configured);
    } catch (err) {
      setConfigured(false);
      setError(err instanceof Error ? err.message : "Failed to check NFT minting config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigured();
  }, [fetchConfigured]);

  return { configured, loading, error, refetch: fetchConfigured };
}
