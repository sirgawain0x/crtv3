import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { decodePaymentSignatureHeader, encodePaymentResponseHeader } from '@x402/core/http';
import type { PaymentPayload, PaymentRequirements } from '@x402/core/types';
import { keccak256, stringToHex } from 'viem';
import { consumePaymentReceipt } from '@/lib/middleware/paymentReplayGuard';
import { CDP_FACILITATOR_URL, X402_NETWORK } from './x402-config';

export type FacilitatedPaymentResult =
  | { ok: true; paymentResponse: string }
  | { ok: false; error: string; unavailable?: boolean };

export function createX402Facilitator() {
  const configuredUrl = process.env.X402_FACILITATOR_URL?.trim() || CDP_FACILITATOR_URL;
  if (configuredUrl.replace(/\/+$/, '') !== CDP_FACILITATOR_URL) {
    throw new Error('Coinbase CDP facilitator URL is required');
  }
  // Reuse the server credential names already used by Coinbase onboarding.
  // Choose one complete pair; never mix an ID and secret from different pairs.
  const credentials = [
    { apiKeyId: process.env.CDP_API_KEY_ID, apiKeySecret: process.env.CDP_API_KEY_SECRET },
    { apiKeyId: process.env.CDP_API_KEY, apiKeySecret: process.env.CDP_API_SECRET },
    { apiKeyId: process.env.COINBASE_CDP_API_KEY_ID, apiKeySecret: process.env.COINBASE_CDP_API_KEY_SECRET },
  ].find(({ apiKeyId, apiKeySecret }) => apiKeyId?.trim() || apiKeySecret?.trim());
  const apiKeyId = credentials?.apiKeyId?.trim();
  const apiKeySecret = credentials?.apiKeySecret?.trim().replace(/\\n/g, '\n');
  if (!apiKeyId || !apiKeySecret) throw new Error('Coinbase CDP server credentials are not configured');
  return new HTTPFacilitatorClient({
    url: CDP_FACILITATOR_URL,
    timeoutMs: 25_000,
    createAuthHeaders: async () => {
      const authFor = async (method: 'GET' | 'POST', operation: string) => {
        const endpoint = new URL(`${CDP_FACILITATOR_URL}/${operation}`);
        const jwt = await generateJwt({ apiKeyId, apiKeySecret, requestMethod: method,
          requestHost: endpoint.host, requestPath: endpoint.pathname, expiresIn: 120 });
        return { Authorization: `Bearer ${jwt}` };
      };
      const [supported, verify, settle] = await Promise.all([
        authFor('GET', 'supported'), authFor('POST', 'verify'), authFor('POST', 'settle'),
      ]);
      return { supported, verify, settle };
    },
  });
}

export async function settleX402Payment(
  header: string,
  requirements: PaymentRequirements,
): Promise<FacilitatedPaymentResult> {
  if (header.length > 16_384) return { ok: false, error: 'Payment signature too large' };
  let payment: PaymentPayload;
  try {
    payment = decodePaymentSignatureHeader(header);
    const accepted = payment.accepted;
    if (payment.x402Version !== 2 || accepted?.scheme !== requirements.scheme ||
        accepted.network !== requirements.network || accepted.amount !== requirements.amount ||
        accepted.asset?.toLowerCase() !== requirements.asset.toLowerCase() ||
        accepted.payTo?.toLowerCase() !== requirements.payTo.toLowerCase()) {
      return { ok: false, error: 'Payment does not match this resource' };
    }
  } catch {
    return { ok: false, error: 'Invalid payment signature' };
  }

  try {
    const facilitator = createX402Facilitator();
    const supported = await facilitator.getSupported();
    if (!supported.kinds.some((kind) => kind.x402Version === 2 && kind.scheme === 'exact' && kind.network === X402_NETWORK)) {
      return { ok: false, error: 'Coinbase facilitator does not support Base mainnet', unavailable: true };
    }
    const verified = await facilitator.verify(payment, requirements);
    if (!verified.isValid) return { ok: false, error: 'Payment authorization rejected' };

    const authorization = payment.payload.authorization as { from?: string; nonce?: string } | undefined;
    if (!authorization?.from || !authorization.nonce ||
        !/^0x[0-9a-fA-F]{40}$/.test(authorization.from) || !/^0x[0-9a-fA-F]{64}$/.test(authorization.nonce)) {
      return { ok: false, error: 'Invalid payment authorization' };
    }
    // Reserve before settlement, globally across resources and instances. Keep
    // reservations after timeouts: the transaction may have been broadcast.
    const reservation = keccak256(stringToHex([
      'x402-v2', requirements.network, requirements.asset.toLowerCase(),
      authorization.from.toLowerCase(), authorization.nonce.toLowerCase(),
    ].join(':')));
    const reserved = await consumePaymentReceipt(reservation, 'x402-authorization');
    if (!reserved.ok) return { ok: false, error: reserved.error, unavailable: reserved.error !== 'Payment proof already used' };

    const settled = await facilitator.settle(payment, requirements);
    if (!settled.success || settled.network !== X402_NETWORK || !/^0x[0-9a-fA-F]{64}$/.test(settled.transaction)) {
      return { ok: false, error: 'Payment settlement not confirmed' };
    }
    return { ok: true, paymentResponse: encodePaymentResponseHeader(settled) };
  } catch {
    // Do not expose facilitator credentials, raw signatures or provider errors.
    return { ok: false, error: 'Payment service unavailable; settlement may be pending', unavailable: true };
  }
}
