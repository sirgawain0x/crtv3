/** Attach the facilitator receipt without buffering streaming response bodies. */
export async function withPlatformApiPaymentHeaders(
  response: Response | Promise<Response>,
  access: { paymentResponse?: string },
): Promise<Response> {
  const resolved = await response;
  if (!access.paymentResponse) return resolved;
  const headers = new Headers(resolved.headers);
  headers.set('PAYMENT-RESPONSE', access.paymentResponse);
  headers.set('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, PAYMENT-RESPONSE');
  headers.set('Cache-Control', 'no-store');
  return new Response(resolved.body, { status: resolved.status, statusText: resolved.statusText, headers });
}
