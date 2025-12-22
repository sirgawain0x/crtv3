"use client";

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyleOptions, AreaStyleOptions, ColorType } from 'lightweight-charts';
import { useTheme } from 'next-themes';
import {
  ChartDataPoint,
  VolumeDataPoint,
  convertToChartData,
  convertToVolumeData,
  getChartColors,
  getLineSeriesOptions,
  getAreaSeriesOptions,
  getVolumeSeriesOptions,
} from '@/lib/utils/chart-utils';
import { PriceHistoryPoint } from '@/app/api/market/tokens/[address]/price-history/route';

export type ChartType = 'line' | 'area';

interface TradingViewChartProps {
  data: PriceHistoryPoint[];
  chartType?: ChartType;
  showVolume?: boolean;
  height?: number;
  width?: number;
  className?: string;
}

export function TradingViewChart({
  data,
  chartType = 'line',
  showVolume = false,
  height = 400,
  width,
  className,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line' | 'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const { theme, systemTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // Determine if dark mode (default to false if theme not available)
  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark') || false;

  // Mount check for SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!isMounted || !chartContainerRef.current) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    const colors = getChartColors(isDark);

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: width || chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      rightPriceScale: {
        borderColor: colors.grid,
      },
      timeScale: {
        borderColor: colors.grid,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add price series
    const chartData = convertToChartData(data);
    let series: ISeriesApi<'Line' | 'Area'>;

    if (chartType === 'area') {
      const areaOptions = getAreaSeriesOptions(isDark);
      // Use addSeries with proper v5.x API structure
      series = chart.addSeries({
        ...areaOptions,
        type: 'Area',
      } as any) as ISeriesApi<'Area'>;
    } else {
      const lineOptions = getLineSeriesOptions(isDark);
      // Use addSeries with proper v5.x API structure
      series = chart.addSeries({
        ...lineOptions,
        type: 'Line',
      } as any) as ISeriesApi<'Line'>;
    }

    series.setData(chartData);
    seriesRef.current = series;

    // Add volume series if requested
    if (showVolume && data.length > 0) {
      const volumeData = convertToVolumeData(data);
      const volumeOptions = getVolumeSeriesOptions(isDark);
      
      // Create volume series on separate price scale using v5.x API
      const volumeSeries = chart.addSeries({
        ...volumeOptions,
        type: 'Histogram',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      } as any) as ISeriesApi<'Histogram'>;

      volumeSeries.setData(volumeData);
      volumeSeriesRef.current = volumeSeries;
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = width || chartContainerRef.current.clientWidth;
        chartRef.current.applyOptions({ width: newWidth });
      }
    };

    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(handleResize);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
      }
    };
  }, [isMounted, height, width, isDark, chartType, showVolume]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const chartData = convertToChartData(data);
    seriesRef.current.setData(chartData);

    // Update volume if shown
    if (showVolume && volumeSeriesRef.current) {
      const volumeData = convertToVolumeData(data);
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [data, showVolume]);

  // Update theme when it changes
  useEffect(() => {
    if (!chartRef.current) return;

    const colors = getChartColors(isDark);
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
    });

    // Update series colors
    if (seriesRef.current) {
      if (chartType === 'area') {
        const areaOptions = getAreaSeriesOptions(isDark);
        seriesRef.current.applyOptions(areaOptions as AreaStyleOptions);
      } else {
        const lineOptions = getLineSeriesOptions(isDark);
        seriesRef.current.applyOptions(lineOptions as LineStyleOptions);
      }
    }
  }, [isDark, chartType]);

  if (!isMounted) {
    return (
      <div
        ref={chartContainerRef}
        className={className}
        style={{ height, width: width || '100%' }}
      />
    );
  }

  return (
    <div
      ref={chartContainerRef}
      className={className}
      style={{ height, width: width || '100%', position: 'relative' }}
    />
  );
}

