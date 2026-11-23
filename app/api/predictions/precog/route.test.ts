import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformApiAccess } from '@/lib/middleware/platformApiAccess';
import { fetchPrecogMarket } from '@/lib/predictions/precog-markets';
import { checkBotId } from 'botid/server';

vi.mock('@/lib/middleware/platformApiAccess', () => ({ requirePlatformApiAccess: vi.fn() }));
vi.mock('@/lib/predictions/precog-markets', () => ({ fetchPrecogMarket: vi.fn() }));
vi.mock('@/lib/middleware/rateLimit', () => ({ rateLimiters: { generous: vi.fn(async () => null) } }));
vi.mock('botid/server', () => ({ checkBotId: vi.fn(async () => ({ isBot: true })) }));
import { GET } from './route';

const request = () => new NextRequest('http://localhost/api/predictions/precog?chainId=8453&marketId=1');
describe('precog access boundary', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchPrecogMarket).mockResolvedValue(null); });
  it.each(['internal', 'x402'] as const)('serves admitted %s agents without a human-only check', async tier => {
    vi.mocked(requirePlatformApiAccess).mockResolvedValue({ allowed: true, tier, paymentResponse: tier === 'x402' ? 'receipt' : undefined });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(fetchPrecogMarket).toHaveBeenCalledWith(8453, 1);
    expect(checkBotId).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    if (tier === 'x402') expect(response.headers.get('PAYMENT-RESPONSE')).toBe('receipt');
  });
  it('does not fetch data for an unpaid caller', async () => {
    vi.mocked(requirePlatformApiAccess).mockResolvedValue({ allowed: false, response: new NextResponse(null, { status: 402 }) });
    expect((await GET(request())).status).toBe(402);
    expect(fetchPrecogMarket).not.toHaveBeenCalled();
  });
});
