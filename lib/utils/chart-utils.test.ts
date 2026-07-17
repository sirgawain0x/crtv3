import { describe, expect, it } from "vitest";
import {
  CHART_DOWN,
  CHART_UP,
  getBaselineSeriesOptions,
  getCandlestickSeriesOptions,
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
});
