import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketToken, MarketStats } from '@/app/api/market/tokens/route';
import { useMarketRealtime } from './useMarketRealtime';
import { logger } from '@/lib/utils/logger';


export interface MarketFilters {
  type: 'all' | 'metoken' | 'content_coin';
  search: string;
  sortBy: 'price' | 'tvl' | 'market_cap' | 'volume_24h' | 'price_change_24h' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

export interface UseMarketDataOptions {
  filters?: Partial<MarketFilters>;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseMarketDataResult {
  tokens: MarketToken[];
  stats: MarketStats | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: MarketFilters;
  setFilters: (filters: Partial<MarketFilters>) => void;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

const defaultFilters: MarketFilters = {
  type: 'all',
  search: '',
  sortBy: 'tvl',
  sortOrder: 'desc',
};

export function useMarketData(options: UseMarketDataOptions = {}): UseMarketDataResult {
  const {
    filters: initialFilters = {},
    limit = 50,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
  } = options;

  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
  });
  const [filters, setFiltersState] = useState<MarketFilters>({
    ...defaultFilters,
    ...initialFilters,
  });
  const [currentPage, setCurrentPage] = useState(0);

  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: filters.type,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: limit.toString(),
        offset: (currentPage * limit).toString(),
        includeStats: 'true',
      });

      const response = await fetch(`/api/market/tokens?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTokens(data.data || []);
      setStats(data.stats || null);
      setPagination({
        total: data.pagination?.total || 0,
        limit: data.pagination?.limit || limit,
        offset: data.pagination?.offset || 0,
        hasMore: data.pagination?.hasMore || false,
      });
    } catch (err) {
      logger.error('Error fetching market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      setTokens([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.search, filters.sortBy, filters.sortOrder, currentPage, limit]);

  // Debounce search input
  useEffect(() => {
    if (filters.search) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(0); // Reset to first page on search
        fetchMarketData();
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      setCurrentPage(0);
      fetchMarketData();
    }
  }, [filters.search, fetchMarketData]);

  // Fetch when filters change (except search, which is handled above)
  useEffect(() => {
    if (!filters.search) {
      setCurrentPage(0);
      fetchMarketData();
    }
  }, [filters.type, filters.sortBy, filters.sortOrder, fetchMarketData]);

  // Fetch when page changes
  useEffect(() => {
    if (filters.search) {
      // Search debounce handles this
      return;
    }
    fetchMarketData();
  }, [currentPage, filters.search, fetchMarketData]);

  // Auto-refresh - use ref to track if we should refresh
  const shouldRefreshRef = useRef(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      // Only refresh if not currently loading to avoid overlapping requests
      if (shouldRefreshRef.current) {
        fetchMarketData();
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchMarketData]);

  // Track loading state
  useEffect(() => {
    shouldRefreshRef.current = !loading;
  }, [loading]);

  const setFilters = useCallback((newFilters: Partial<MarketFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const refresh = useCallback(async () => {
    await fetchMarketData();
  }, [fetchMarketData]);

  // Real-time updates
  const handleRealtimeUpdate = useCallback(async (tokenAddress: string) => {
    // Debounce or throttle could be added here
    logger.debug(`⚡ Real-time update for ${tokenAddress}`);

    try {
      // Fetch fresh data for this specific token
      const response = await fetch(`/api/market/tokens/${tokenAddress}/fresh`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setTokens(prevTokens =>
            prevTokens.map(t =>
              t.address.toLowerCase() === tokenAddress.toLowerCase()
                ? { ...t, ...result.data } // Merge fresh data
                : t
            )
          );
        }
      }
    } catch (error) {
      logger.error('Failed to fetch fresh token data:', error);
    }
  }, []);

  useMarketRealtime(tokens, {
    enabled: autoRefresh, // Only use WSS if auto-refresh is on (or add specific flag)
    onUpdate: handleRealtimeUpdate
  });

  return {
    tokens,
    stats,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    setPage,
    refresh,
  };
}

