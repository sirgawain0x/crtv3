import { describe, expect, it } from 'vitest';
import { withPlatformApiPaymentHeaders } from './payment-response';
describe('facilitator receipt propagation', () => {
  it('attaches the receipt and disables caching without changing the body', async () => {
    const response = await withPlatformApiPaymentHeaders(Response.json({ ok: true }, { status: 201 }), { paymentResponse: 'settlement-receipt' });
    expect(response.status).toBe(201);
    expect(response.headers.get('PAYMENT-RESPONSE')).toBe('settlement-receipt');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ ok: true });
  });
  it.each([{}, { paymentResponse: 'receipt' }])('overrides shared caches for every admitted caller %j', async access => {
    const original = Response.json({ ok: true }, { headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      'CDN-Cache-Control': 'public, max-age=120',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=120',
    } });
    const response = await withPlatformApiPaymentHeaders(original, access);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
  });
  it('preserves streaming bodies and existing exposed headers', async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('chunk')); controller.close(); } });
    const response = await withPlatformApiPaymentHeaders(new Response(stream, { headers: { 'Access-Control-Expose-Headers': 'X-Request-Id' } }), { paymentResponse: 'receipt' });
    expect(response.body).toBe(stream);
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain('X-Request-Id');
    expect(await response.text()).toBe('chunk');
  });
  it('does not add a payment receipt to free or internal requests', async () => {
    const response = Response.json({ ok: true });
    const result = await withPlatformApiPaymentHeaders(response, {});
    expect(result.headers.has('PAYMENT-RESPONSE')).toBe(false);
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
