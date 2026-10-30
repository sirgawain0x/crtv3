import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const CRTVAI = '0xecb695544a3d2a64d579b3828f3f60f6932f4846';

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/sdk/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/utils/logger', () => ({
  serverLogger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/metokens/resolveLiveMeTokenMarket', () => ({
  resolveLiveMeTokenMarket: vi.fn(async () => ({
    totalSupplyWei: 3199997731857693174n,
    tvl: 9.120001,
    price: 2.850002332565895,
    hubId: 2,
  })),
}));

import { GET } from './route';

function makeRequest(period: '7d' | '30d' | 'all') {
  const interval = period === '7d' ? 'hour' : 'day';
  return new NextRequest(
    `http://localhost/api/market/tokens/${CRTVAI}/price-history?period=${period}&interval=${interval}`
  );
}

describe('CRTVAI price-history (scaled TVL + chain spot)', () => {
  beforeEach(() => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'metokens') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: '51d72640-7fb6-435c-aab3-d40770010583',
                  address: CRTVAI,
                  total_supply: '3199997731857693174',
                  tvl: 9.120001e-12,
                  hub_id: 2,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'metoken_transactions') {
        const txRows = [
          {
            created_at: '2026-07-10T06:30:00.000Z',
            transaction_type: 'mint',
            amount: 1,
            collateral_amount: 3.13,
          },
          {
            created_at: '2026-07-15T06:30:00.000Z',
            transaction_type: 'mint',
            amount: 2,
            collateral_amount: 5.99,
          },
        ];
        const orderResult = async () => ({ data: txRows, error: null });
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: orderResult,
              }),
              order: orderResult,
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  it('ALL history starts at first transaction, not epoch', async () => {
    const res = await GET(makeRequest('all'), {
      params: Promise.resolve({ address: CRTVAI }),
    });
    const body = await res.json();
    const firstTs = body.data[0]?.timestamp ?? 0;
    expect(firstTs).toBeGreaterThan(1_000_000_000);
    expect(firstTs).toBeLessThan(2_000_000_000);
  });

  for (const period of ['7d', '30d', 'all'] as const) {
    it(`returns ~$2.85 prices for ${period}`, async () => {
      const res = await GET(makeRequest(period), {
        params: Promise.resolve({ address: CRTVAI }),
      });
      const body = await res.json();

      expect(body.token.current_price).toBeCloseTo(2.85, 2);
      expect(body.token.current_tvl).toBeCloseTo(9.12, 2);
      expect(body.data.length).toBeGreaterThan(0);
      for (const point of body.data) {
        expect(point.price).toBeGreaterThan(1);
        expect(point.price).toBeLessThan(10);
      }
    });
  }
});
