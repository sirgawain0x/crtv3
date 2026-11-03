import { describe, expect, it } from "vitest";
import { LineStyle } from "lightweight-charts";
import {
  buildChartPriceDisplay,
  CHART_DOWN,
  CHART_UP,
  getBaselineSeriesOptions,
  getCandlestickSeriesOptions,
  getPeriodOpenPriceLineOptions,
  prepareChartHistory,
} from "./chart-utils";

describe("chart-utils PnL colors", () => {
  it("sets candle up/down wick and border colors", () => {
    const opts = getCandlestickSeriesOptions(false);
    expect(opts.upColor).toBe(CHART_UP);
    expect(opts.downColor).toBe(CHART_DOWN);
    expect(opts.borderUpColor).toBe(CHART_UP);
    expect(opts.borderDownColor).toBe(CHART_DOWN);
    expect(opts.wickUpColor).toBe(CHART_UP);
    expect(opts.wickDownColor).toBe(CHART_DOWN);
  });

  it("anchors baseline series to period open with green/red fills", () => {
    const opts = getBaselineSeriesOptions(1.25);
    expect(opts.baseValue).toEqual({ type: "price", price: 1.25 });
    expect(opts.topLineColor).toBe(CHART_UP);
    expect(opts.bottomLineColor).toBe(CHART_DOWN);
  });

  it("labels period-open price line for baseline cue", () => {
    const opts = getPeriodOpenPriceLineOptions(0.5568, false);
    expect(opts.price).toBe(0.5568);
    expect(opts.title).toBe("Period open");
    expect(opts.lineStyle).toBe(LineStyle.Dashed);
    expect(opts.axisLabelVisible).toBe(true);
  });
});

describe("chart price header and history", () => {
  const now = 1_700_000_000;

  it("uses spot price for header when history ends at zero", () => {
    const display = buildChartPriceDisplay(
      [
        { timestamp: now - 3600, price: 0, volume: 0, tvl: 0 },
        { timestamp: now, price: 0, volume: 0, tvl: 0 },
      ],
      2.85,
    );
    expect(display?.headerPrice).toBe(2.85);
    expect(display?.periodChangePercent).toBeNull();
  });

  it("computes period change from first valid point to spot", () => {
    const display = buildChartPriceDisplay(
      [
        { timestamp: now - 7200, price: 2.5, volume: 1, tvl: 8 },
        { timestamp: now - 3600, price: 2.7, volume: 0, tvl: 8.5 },
      ],
      2.85,
    );
    expect(display?.headerPrice).toBe(2.85);
    expect(display?.periodChangePercent).toBeCloseTo(14, 0);
  });

  it("hides period change when base price is implausibly far from spot", () => {
    const display = buildChartPriceDisplay(
      [{ timestamp: now - 7200, price: 2.85e-12, volume: 0, tvl: 0 }],
      2.85,
    );
    expect(display?.headerPrice).toBe(2.85);
    expect(display?.periodChangePercent).toBeNull();
  });

  it("computes ALL-style period change from first real transaction, not epoch", () => {
    const firstTxTime = 1_785_000_000;
    const display = buildChartPriceDisplay(
      [
        { timestamp: firstTxTime, price: 3.13, volume: 1, tvl: 9 },
        { timestamp: firstTxTime + 86_400, price: 2.95, volume: 0, tvl: 9.1 },
      ],
      2.85,
    );
    expect(display?.headerPrice).toBe(2.85);
    expect(display?.periodChangePercent).toBeCloseTo(-8.95, 0);
    expect(display?.basePrice).toBe(3.13);
  });

  it("falls back to a single point when history is empty", () => {
    const series = prepareChartHistory([], 2.85, now);
    expect(series).toHaveLength(1);
    expect(series[0].price).toBe(2.85);
    expect(series[0].timestamp).toBe(now);
  });

  it("replaces the last point when spot update shares the same timestamp", () => {
    const series = prepareChartHistory(
      [{ timestamp: now, price: 2.5, volume: 0, tvl: 9 }],
      2.85,
      now,
    );
    expect(series).toHaveLength(1);
    expect(series[0].timestamp).toBe(now);
    expect(series[0].price).toBe(2.85);
  });
});
