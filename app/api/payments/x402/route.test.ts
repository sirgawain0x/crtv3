import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodePaymentRequiredHeader } from '@x402/core/http';
import { CREATIVE_TREASURY_ADDRESS } from '@/lib/payments/x402-config';
const settle = vi.hoisted(() => vi.fn());
vi.mock('@/lib/payments/x402-facilitator', () => ({ settleX402Payment: settle }));
vi.mock('@/lib/middleware/rateLimit', () => ({ rateLimiters: { standard: vi.fn(async () => null) } }));
import { POST } from './route';
const request = (body: unknown, signature?: string) => new NextRequest('https://tv.creativeplatform.xyz/api/payments/x402', {
  method: 'POST', body: JSON.stringify(body), headers: signature ? { 'PAYMENT-SIGNATURE': signature } : {},
});
beforeEach(() => { settle.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
describe('feature payment collection', () => {
  it('issues a standard v2 challenge payable to the Safe', async () => {
    const response = await POST(request({ service: 'creative-guide', amount: '5000' }));
    expect(response.status).toBe(402);
    const required = decodePaymentRequiredHeader(response.headers.get('PAYMENT-REQUIRED')!);
    expect(required.x402Version).toBe(2);
    expect(required.accepts[0]).toMatchObject({ amount: '5000', payTo: CREATIVE_TREASURY_ADDRESS, network: 'eip155:8453' });
    expect(settle).not.toHaveBeenCalled();
  });
  it.each([{ service: 'creative-guide', amount: '1' }, { service: 'unknown', amount: '5000' }, { service: 'creative-guide', amount: '5000', recipient: '0x' + '1'.repeat(40) }])('rejects caller-selected prices or recipients', async (body) => {
    expect((await POST(request(body, 'signature'))).status).toBe(400);
    expect(settle).not.toHaveBeenCalled();
  });
  it('returns the facilitator receipt only after successful settlement', async () => {
    settle.mockResolvedValue({ ok: true, paymentResponse: 'confirmed-receipt' });
    const response = await POST(request({ service: 'creative-guide', amount: '5000' }, 'signature'));
    expect(response.status).toBe(200);
    expect(response.headers.get('PAYMENT-RESPONSE')).toBe('confirmed-receipt');
    expect(settle).toHaveBeenCalledWith('signature', expect.objectContaining({ amount: '5000', payTo: CREATIVE_TREASURY_ADDRESS }));
  });
  it('fails closed while the facilitator is not mainnet ready', async () => {
    settle.mockResolvedValue({ ok: false, error: 'Unsupported network', unavailable: true });
    expect((await POST(request({ service: 'creative-guide', amount: '5000' }, 'signature'))).status).toBe(503);
  });
});
