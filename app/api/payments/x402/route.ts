import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/middleware/rateLimit';
import { buildX402PaymentRequiredResponse, PLATFORM_API_CORS_HEADERS, verifyX402PaymentFromRequest } from '@/lib/middleware/x402Gate';
import { CREATIVE_TREASURY_ADDRESS } from '@/lib/payments/x402-config';
import { withPlatformApiPaymentHeaders } from '@/lib/payments/payment-response';

/** Collect feature payments through our facilitator; prices are enforced server-side. */
export async function POST(request: NextRequest) {
  const limited = await rateLimiters.standard(request);
  if (limited) return limited;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid payment request' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid payment request' }, { status: 400 });
  const validPrice = body.service === 'creative-guide'
    ? body.amount === '5000'
    : body.service === 'ai-thumbnail-generation' && (body.amount === '500000' || body.amount === '1000000');
  if (!validPrice || (body.recipient && String(body.recipient).toLowerCase() !== CREATIVE_TREASURY_ADDRESS.toLowerCase())) {
    return NextResponse.json({ error: 'Unsupported service, price or recipient' }, { status: 400 });
  }
  const options = { resource: String(body.service), priceUsdc: String(body.amount), recipient: CREATIVE_TREASURY_ADDRESS, requestUrl: request.url };
  const payment = await verifyX402PaymentFromRequest(request, options);
  if (!payment.ok) {
    if (payment.error === 'Missing payment proof') return buildX402PaymentRequiredResponse(options);
    return NextResponse.json({ error: payment.error }, { status: payment.unavailable ? 503 : 402, headers: PLATFORM_API_CORS_HEADERS });
  }
  return withPlatformApiPaymentHeaders(NextResponse.json({ success: true }), payment);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PLATFORM_API_CORS_HEADERS });
}
