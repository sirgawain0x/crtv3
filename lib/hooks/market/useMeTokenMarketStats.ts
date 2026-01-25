import { useState, useEffect } from 'react';
import { MarketToken } from '@/app/api/market/tokens/route';
import { logger } from '@/lib/utils/logger';

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
                const response = await fetch(`/api/market/tokens?search=${address}&limit=1&includeStats=true`);

                if (!response.ok) {
                    throw new Error('Failed to fetch market stats');
                }

                const data = await response.json();

                if (data.data && data.data.length > 0) {
                    // Find the exact generic token match (search is fuzzy)
                    const token = data.data.find((t: MarketToken) => t.address.toLowerCase() === address.toLowerCase());

                    if (token) {
                        setStats(token);
                    } else {
                        // If explicit match not found, but we searched by address, it should be the first one ideally
                        // But let's be safe and check
                        if (data.data[0].address.toLowerCase() === address.toLowerCase()) {
                            setStats(data.data[0]);
                        }
                    }
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
