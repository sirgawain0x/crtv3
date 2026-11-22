/** Keep admitted responses private and attach receipts without buffering streams. */
export async function withPlatformApiPaymentHeaders(
  response: Response | Promise<Response>,
  access: { paymentResponse?: string },
): Promise<Response> {
  const resolved = await response;
  const headers = new Headers(resolved.headers);
  // Every caller must pass the access gate; a human response must never seed a
  // shared cache that would also serve anonymous bots without running the gate.
  headers.set('Cache-Control', 'private, no-store');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Vercel-CDN-Cache-Control', 'no-store');
  if (access.paymentResponse) {
    headers.set('PAYMENT-RESPONSE', access.paymentResponse);
    const exposed = new Set((headers.get('Access-Control-Expose-Headers') ?? '')
      .split(',').map(value => value.trim()).filter(Boolean));
    exposed.add('PAYMENT-REQUIRED');
    exposed.add('PAYMENT-RESPONSE');
    headers.set('Access-Control-Expose-Headers', [...exposed].join(', '));
  }
  return new Response(resolved.body, { status: resolved.status, statusText: resolved.statusText, headers });
}
