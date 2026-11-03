import { useState, useEffect } from 'react';
import { MarketToken } from '@/app/api/market/tokens/route';
import { logger } from '@/lib/utils/logger';
import { resolveMeTokenMarketStatsFromResponse } from '@/lib/hooks/market/marketStatsSelection';

export interface MeTokenMarketStats {
    price: number;
    priceCheckChange24h: number;
    volume24h: number;
    marketCap: number;
    loading: boolean;
    error: string | null;
}

export function useMeTokenMarketStats(address?: string) {
    const [stats, setStats] = useState<MarketToken | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!address) {
            setStats(null);
            return;
        }

        const fetchStats = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch from market API to get 24h change and other computed stats
                const response = await fetch(
                    `/api/market/tokens?search=${encodeURIComponent(address)}&limit=1&includeStats=true`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch market stats');
                }

                const data = await response.json();

                const token = resolveMeTokenMarketStatsFromResponse(
                    data.data as MarketToken[] | undefined,
                    address
                );
                if (token) {
                    setStats(token);
                }
            } catch (err) {
                logger.error('Error fetching MeToken market stats:', err);
                setError('Failed to load market stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Auto-refresh every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [address]);

    return {
        stats,
        loading,
        error
    };
}
