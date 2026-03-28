"use client";

import { useState, useEffect } from 'react';
import { MeToken } from '@/lib/sdk/supabase/client';
import { logger } from '@/lib/utils/logger';


/**
 * Hook to fetch MeToken by owner address
 * @param ownerAddress - The owner address to fetch MeToken for
 * @returns MeToken data or null if not found
 */
export function useMeTokenByOwner(ownerAddress?: string | null) {
  const [meToken, setMeToken] = useState<MeToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerAddress) {
      setMeToken(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/metokens?owner=${encodeURIComponent(ownerAddress)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            setMeToken(null);
            return;
          }
          throw new Error(`Failed to fetch MeToken: ${res.statusText}`);
        }
        const result = await res.json();
        setMeToken(result.data || null);
      })
      .catch((err) => {
        logger.error('Error fetching MeToken by owner:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch MeToken');
        setMeToken(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ownerAddress]);

  return { meToken, loading, error };
}

