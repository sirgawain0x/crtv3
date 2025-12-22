import { PriceHistoryPoint } from '@/app/api/market/tokens/[address]/price-history/route';
import { IChartApi, ISeriesApi, LineStyleOptions, AreaStyleOptions, CandlestickStyleOptions, HistogramStyleOptions, UTCTimestamp, Time, LineData, AreaData, HistogramData } from 'lightweight-charts';

// Use the actual types from lightweight-charts
export type ChartDataPoint = LineData<Time> | AreaData<Time>;
export type VolumeDataPoint = HistogramData<Time>;

export interface CandlestickDataPoint {
  time: UTCTimestamp; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Convert price history data to lightweight-charts format
 */
export function convertToChartData(priceHistory: PriceHistoryPoint[]): ChartDataPoint[] {
  return priceHistory.map((point) => ({
    time: point.timestamp as UTCTimestamp,
    value: point.price,
  } as LineData<Time>));
}

/**
 * Convert price history to candlestick format
 * Note: This creates synthetic OHLC from price data
 * For real candlesticks, you'd need actual OHLC data
 */
export function convertToCandlestickData(priceHistory: PriceHistoryPoint[]): CandlestickDataPoint[] {
  if (priceHistory.length === 0) return [];

  // Group by time period (hour/day) to create candles
  const candles: CandlestickDataPoint[] = [];
  const grouped = new Map<number, PriceHistoryPoint[]>();

  // Group points by hour (for hourly data) or day (for daily data)
  for (const point of priceHistory) {
    const timeKey = Math.floor(point.timestamp / 3600) * 3600; // Round to hour
    if (!grouped.has(timeKey)) {
      grouped.set(timeKey, []);
    }
    grouped.get(timeKey)!.push(point);
  }

  // Create candles from grouped data
  for (const [timeKey, points] of grouped.entries()) {
    const prices = points.map((p) => p.price);
    const open = prices[0];
    const close = prices[prices.length - 1];
    const high = Math.max(...prices);
    const low = Math.min(...prices);

    candles.push({
      time: timeKey as UTCTimestamp,
      open,
      high,
      low,
      close,
    });
  }

  return candles.sort((a, b) => a.time - b.time);
}

/**
 * Convert volume data to lightweight-charts format
 */
export function convertToVolumeData(priceHistory: PriceHistoryPoint[]): VolumeDataPoint[] {
  return priceHistory.map((point) => ({
    time: point.timestamp as UTCTimestamp,
    value: point.volume,
  } as HistogramData<Time>));
}

/**
 * Get chart colors based on theme
 */
export function getChartColors(isDark: boolean): {
  background: string;
  text: string;
  grid: string;
  line: string;
  areaTop: string;
  areaBottom: string;
  volumeUp: string;
  volumeDown: string;
} {
  if (isDark) {
    return {
      background: '#1a1a1a',
      text: '#d1d5db',
      grid: '#374151',
      line: '#3b82f6',
      areaTop: 'rgba(59, 130, 246, 0.5)',
      areaBottom: 'rgba(59, 130, 246, 0.05)',
      volumeUp: 'rgba(34, 197, 94, 0.5)',
      volumeDown: 'rgba(239, 68, 68, 0.5)',
    };
  } else {
    return {
      background: '#ffffff',
      text: '#1f2937',
      grid: '#e5e7eb',
      line: '#3b82f6',
      areaTop: 'rgba(59, 130, 246, 0.5)',
      areaBottom: 'rgba(59, 130, 246, 0.05)',
      volumeUp: 'rgba(34, 197, 94, 0.5)',
      volumeDown: 'rgba(239, 68, 68, 0.5)',
    };
  }
}

/**
 * Get line series options
 */
export function getLineSeriesOptions(isDark: boolean): Partial<LineStyleOptions> {
  const colors = getChartColors(isDark);
  return {
    color: colors.line,
    lineWidth: 2,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
  };
}

/**
 * Get area series options
 */
export function getAreaSeriesOptions(isDark: boolean): Partial<AreaStyleOptions> {
  const colors = getChartColors(isDark);
  return {
    lineColor: colors.line,
    topColor: colors.areaTop,
    bottomColor: colors.areaBottom,
    lineWidth: 2,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4,
  };
}

/**
 * Get candlestick series options
 */
export function getCandlestickSeriesOptions(isDark: boolean): Partial<CandlestickStyleOptions> {
  return {
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderVisible: true,
    wickVisible: true,
  };
}

/**
 * Get volume histogram options
 */
export function getVolumeSeriesOptions(isDark: boolean): Partial<HistogramStyleOptions> {
  const colors = getChartColors(isDark);
  return {
    color: colors.volumeUp,
  };
}

/**
 * Format timestamp for display
 */
export function formatTime(timestamp: number, period: '7d' | '30d' | 'all'): string {
  const date = new Date(timestamp * 1000);
  
  if (period === '7d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (period === '30d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

