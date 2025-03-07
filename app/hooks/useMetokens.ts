import { useEffect, useState } from 'react';
import {
  getUserMetoken,
  getMetokenBalances,
  MetokenRegistration,
  MetokenBalances,
} from '@app/lib/sdk/hyperindex/queries/metoken.new';

export interface MetokenInfo {
  registration: MetokenRegistration | null;
  balances: MetokenBalances | null;
}

export function useMetoken(walletAddress?: string) {
  const [metokenInfo, setMetokenInfo] = useState<MetokenInfo>({
    registration: null,
    balances: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchMetokenData() {
      if (!walletAddress) {
        setMetokenInfo({ registration: null, balances: null });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First get the metoken registration
        const registration = await getUserMetoken(walletAddress);

        // If we found a registration, get the balances
        let balances = null;
        if (registration) {
          balances = await getMetokenBalances(registration.id);
        }

        setMetokenInfo({ registration, balances });
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to fetch metoken data'),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetokenData();
  }, [walletAddress]);

  return {
    metoken: metokenInfo.registration,
    balances: metokenInfo.balances,
    isLoading,
    error,
    hasMetoken: !!metokenInfo.registration,
  };
}
