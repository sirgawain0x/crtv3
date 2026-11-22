import { describe, expect, it } from 'vitest';
import { withPlatformApiPaymentHeaders } from './payment-response';
describe('facilitator receipt propagation', () => {
  it('attaches the receipt and disables caching without changing the body', async () => {
    const response = await withPlatformApiPaymentHeaders(Response.json({ ok: true }, { status: 201 }), { paymentResponse: 'settlement-receipt' });
    expect(response.status).toBe(201);
    expect(response.headers.get('PAYMENT-RESPONSE')).toBe('settlement-receipt');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
  });
  it('does not add a payment receipt to free or internal requests', async () => {
    const response = Response.json({ ok: true });
    expect(await withPlatformApiPaymentHeaders(response, {})).toBe(response);
  });
});
