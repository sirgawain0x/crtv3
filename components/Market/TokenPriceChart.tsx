"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PriceHistoryPoint } from '@/app/api/market/tokens/[address]/price-history/route';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { TradingViewChart } from './TradingViewChart';
import { logger } from '@/lib/utils/logger';
import {
  buildChartPriceDisplay,
  prepareChartHistory,
} from '@/lib/utils/chart-utils';


interface TokenPriceChartProps {
  tokenAddress: string;
  tokenSymbol?: string;
  /** Live price from the same source as surrounding stat cards (TVL / supply). */
  spotPrice?: number | null;
  className?: string;
  height?: number;
  showControls?: boolean;
}

export function TokenPriceChart({
  tokenAddress,
  tokenSymbol,
  spotPrice,
  className,
  height = 200,
  showControls = true,
}: TokenPriceChartProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [apiCurrentPrice, setApiCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedSpotPrice = useMemo(() => {
    if (spotPrice != null && spotPrice > 0) {
      return spotPrice;
    }
    if (apiCurrentPrice != null && apiCurrentPrice > 0) {
      return apiCurrentPrice;
    }
    return null;
  }, [spotPrice, apiCurrentPrice]);

  const chartData = useMemo(
    () => prepareChartHistory(data, resolvedSpotPrice ?? undefined),
    [data, resolvedSpotPrice],
  );

  const priceInfo = useMemo(
    () => buildChartPriceDisplay(data, resolvedSpotPrice ?? undefined),
    [data, resolvedSpotPrice],
  );

  // Fetch price history
  useEffect(() => {
    const fetchData = async () => {
      if (!tokenAddress) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = `/api/market/tokens/${encodeURIComponent(tokenAddress)}/price-history?period=${period}&interval=${period === '7d' ? 'hour' : 'day'}`;
        const response = await fetch(url);

        if (!response.ok) {
          let errorMessage = `Failed to fetch price history (${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If JSON parsing fails, use default message
          }

          if (response.status === 404) {
            logger.debug('Token not found or no price history available');
            setData([]);
            setApiCurrentPrice(null);
            setError(null);
            return;
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        logger.debug('📊 Price History API Response:', result);

        setData(result.data || []);
        const fromApi = result.token?.current_price;
        setApiCurrentPrice(typeof fromApi === 'number' ? fromApi : null);
      } catch (err) {
        logger.error('Error fetching price history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart');
        setData([]);
        setApiCurrentPrice(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tokenAddress, period]);

  const periodLabel =
    period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : 'All Time';

  const periodControls = showControls ? (
    <div className="flex gap-1">
      {(['7d', '30d', 'all'] as const).map((p) => (
        <Button
          key={p}
          variant={period === p ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setPeriod(p)}
          className="h-7 text-xs"
        >
          {p === '7d' ? '7D' : p === '30d' ? '30D' : 'ALL'}
        </Button>
      ))}
    </div>
  ) : null;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                {tokenSymbol ? `${tokenSymbol} Price` : 'Price Chart'}
              </CardTitle>
              <CardDescription className="text-xs">{periodLabel}</CardDescription>
            </div>
            {periodControls}
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {tokenSymbol ? `${tokenSymbol} Price` : 'Price Chart'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-muted-foreground" style={{ height }}>
          {error}
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {tokenSymbol ? `${tokenSymbol} Price` : 'Price Chart'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-muted-foreground" style={{ height }}>
          No chart data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {tokenSymbol ? `${tokenSymbol} Price` : 'Price Chart'}
            </CardTitle>
            <CardDescription className="text-xs">{periodLabel}</CardDescription>
          </div>
          {periodControls}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {priceInfo && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                ${priceInfo.headerPrice.toFixed(4)}
              </span>
              {priceInfo.periodChangePercent != null ? (
                <span
                  className={cn(
                    'text-sm font-medium',
                    priceInfo.isNeutral
                      ? 'text-muted-foreground'
                      : priceInfo.isPositive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {priceInfo.isPositive ? '+' : ''}
                  {priceInfo.periodChangePercent.toFixed(2)}%
                </span>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">—</span>
              )}
            </div>
          )}

          <div className="relative" style={{ width: '100%', height }}>
            <TradingViewChart
              data={chartData}
              chartType="baseline"
              showVolume={chartData.length > 1}
              basePrice={priceInfo?.basePrice}
              isPositive={priceInfo?.isNeutral ? undefined : priceInfo?.isPositive}
              height={height}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
