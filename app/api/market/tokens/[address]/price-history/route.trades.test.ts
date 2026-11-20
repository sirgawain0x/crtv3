import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({ trades: [] as Array<Record<string, unknown>>, supply: 8157198948020652174n, tvl: 37.270001 }));
vi.mock('@/lib/sdk/supabase/server', () => ({ createClient: async () => ({ from: (table: string) => ({ select: () => ({ eq: () => table === 'metokens'
  ? { single: async () => ({ data: { id: 'token', address: '0x1111111111111111111111111111111111111111', total_supply: state.supply.toString(), tvl: state.tvl, hub_id: 2 }, error: null }) }
  : { gte: () => ({ order: async () => ({ data: state.trades, error: null }) }), order: async () => ({ data: state.trades, error: null }) } }) }) }) }));
vi.mock('@/lib/metokens/resolveLiveMeTokenMarket', () => ({ resolveLiveMeTokenMarket: async () => ({ totalSupplyWei: state.supply, tvl: state.tvl, price: state.tvl / (Number(state.supply) / 1e18) }) }));
vi.mock('@/lib/utils/logger', () => ({ serverLogger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
import { GET } from './route';
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-20T22:00:00Z'));
  state.supply = 8157198948020652174n; state.tvl = 37.270001;
  state.trades = [{ created_at: '2026-11-20T21:00:00Z', transaction_type: 'mint', amount: '4.957201216162959', collateral_amount: '28.15' }];
});
afterEach(() => vi.useRealTimers());
async function history(period: string) { const response = await GET(new NextRequest('https://example.test/history?period=' + period), { params: Promise.resolve({ address: '0x1111111111111111111111111111111111111111' }) }); expect(response.status).toBe(200); return response.json(); }
it.each(['7d', '30d'])('keeps the pre-trade %s baseline before forward replay', async period => {
  const body = await history(period); const first = body.data[0], last = body.data.at(-1);
  expect(first.price).toBeCloseTo(2.8500023325, 7); expect(last.price).toBeCloseTo(4.5689704563, 7);
  expect((last.price / first.price - 1) * 100).toBeCloseTo(60.3146, 2);
  expect(body.data.reduce((sum: number, point: { volume: number }) => sum + point.volume, 0)).toBeCloseTo(28.15);
});
it('does not manufacture an ALL point at epoch or before the first real trade', async () => {
  const body = await history('all'); expect(body.data[0].timestamp).toBe(Date.parse('2026-11-20T21:00:00Z') / 1000);
});
it('excludes transfers and out-of-window trades from trade volume', async () => {
  state.trades.push({ created_at: '2026-11-20T21:30:00Z', transaction_type: 'transfer', amount: 1000, collateral_amount: 0 });
  state.trades.push({ created_at: '2026-07-20T21:30:00Z', transaction_type: 'mint', amount: 1000, collateral_amount: 1000 });
  const body = await history('7d'); expect(body.data.reduce((sum: number, point: { volume: number }) => sum + point.volume, 0)).toBeCloseTo(28.15);
});

it('keeps an explicit zero-collateral burn at zero volume', async () => {
  state.supply = 1000000000000000000n; state.tvl = 10;
  state.trades = [{ created_at: '2026-11-20T21:00:00Z', transaction_type: 'burn', amount: '0.5', collateral_amount: '0' }];
  const body = await history('7d');
  expect(body.data[0].price).toBeCloseTo(10 / 1.5);
  expect(body.data.reduce((sum: number, point: { volume: number }) => sum + point.volume, 0)).toBe(0);
});
