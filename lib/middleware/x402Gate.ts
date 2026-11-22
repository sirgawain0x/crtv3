import { NextRequest, NextResponse } from "next/server";
import { USDC_TOKEN_ADDRESSES } from "@/lib/contracts/USDCToken";
import { encodePaymentRequiredHeader } from "@x402/core/http";
import type { PaymentRequired, PaymentRequirements } from "@x402/core/types";
import { settleX402Payment } from "@/lib/payments/x402-facilitator";
import { CREATIVE_TREASURY_ADDRESS, X402_NETWORK } from "@/lib/payments/x402-config";

export type X402GateOptions = {
  resource: string;
  priceUsdc: string;
  recipient: string;
  requestUrl?: string;
};

export const PLATFORM_API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, PAYMENT-SIGNATURE, X-Wallet-Address, X-Wallet-Timestamp, X-Wallet-Signature",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
};

export function getX402Recipient(env: NodeJS.ProcessEnv = process.env): string | null {
  const recipient = env.X402_API_RECIPIENT?.trim() || CREATIVE_TREASURY_ADDRESS;
  return recipient.toLowerCase() === CREATIVE_TREASURY_ADDRESS.toLowerCase() ? CREATIVE_TREASURY_ADDRESS : null;
}

export function getX402PriceForResource(
  resource: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envKey = `X402_${resource.replace(/[.-]/g, "_").toUpperCase()}_PRICE`;
  const specific = env[envKey]?.trim();
  if (specific) {
    return specific;
  }

  const defaults: Record<string, string> = {
    "playback.resolve": env.X402_PLAYBACK_RESOLVE_PRICE?.trim() || "10000",
    "videos.published": env.X402_PUBLISHED_LIST_PRICE?.trim() || "25000",
    "playback.info": env.X402_PLAYBACK_INFO_PRICE?.trim() || "50000",
    "views.metrics": env.X402_VIEWS_METRICS_PRICE?.trim() || "50000",
  };

  return defaults[resource] || env.X402_DEFAULT_PRICE?.trim() || "10000";
}

export function buildX402Requirements(options: Pick<X402GateOptions, "priceUsdc" | "recipient">): PaymentRequirements {
  return {
    scheme: "exact",
    network: X402_NETWORK,
    amount: options.priceUsdc,
    payTo: options.recipient,
    maxTimeoutSeconds: 300,
    asset: USDC_TOKEN_ADDRESSES.base,
    extra: { name: "USD Coin", version: "2" },
  };
}

export function buildX402PaymentRequiredResponse(options: X402GateOptions): NextResponse {
  const challenge: PaymentRequired = {
    x402Version: 2,
    resource: {
      url: options.requestUrl || options.resource,
      description: `Creative TV Platform API: ${options.resource}`,
      mimeType: "application/json",
    },
    accepts: [buildX402Requirements(options)],
  };
  return NextResponse.json(challenge, {
    status: 402,
    headers: { ...PLATFORM_API_CORS_HEADERS, "PAYMENT-REQUIRED": encodePaymentRequiredHeader(challenge), "Cache-Control": "no-store" },
  });
}

export async function verifyX402PaymentFromRequest(
  request: NextRequest,
  options: { recipient: string; priceUsdc: string; resource?: string },
): Promise<{ ok: true; paymentResponse?: string } | { ok: false; error: string; unavailable?: boolean }> {
  const signature = request.headers.get("PAYMENT-SIGNATURE");
  if (!signature) return { ok: false, error: "Missing payment proof" };
  if (!/^[1-9][0-9]{0,77}$/.test(options.priceUsdc)) return { ok: false, error: "Invalid price configuration" };
  return settleX402Payment(signature, buildX402Requirements(options));
}
