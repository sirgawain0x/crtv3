import { NextRequest, NextResponse } from "next/server";
import { USDC_TOKEN_ADDRESSES } from "@/lib/contracts/USDCToken";
import { consumePaymentReceipt } from "@/lib/middleware/paymentReplayGuard";
import {
  parsePaymentProofHeader,
  verifyUsdcPaymentProof,
} from "@/lib/middleware/verifyUsdcPayment";

export type X402GateOptions = {
  resource: string;
  priceUsdc: string;
  recipient: string;
  requestUrl?: string;
};

export const PLATFORM_API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Payment-Proof, X-PAYMENT",
};

export function getX402Recipient(env: NodeJS.ProcessEnv = process.env): string | null {
  const recipient = env.X402_API_RECIPIENT?.trim();
  return recipient || null;
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

export function buildX402PaymentRequiredResponse(options: X402GateOptions): NextResponse {
  return NextResponse.json(
    {
      error: "Payment Required",
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "base",
          maxAmountRequired: options.priceUsdc,
          resource: options.resource,
          description: `Creative TV Platform API: ${options.resource}`,
          mimeType: "application/json",
          payTo: options.recipient,
          maxTimeoutSeconds: 300,
          asset: USDC_TOKEN_ADDRESSES.base,
        },
      ],
      paymentInstructions: {
        header: "X-Payment-Proof",
        format: "base64url(JSON.stringify({ transactionHash, amount }))",
        note: "Send a Base USDC transfer to payTo, then retry with the proof header.",
      },
    },
    {
      status: 402,
      headers: PLATFORM_API_CORS_HEADERS,
    },
  );
}

export async function verifyX402PaymentFromRequest(
  request: NextRequest,
  options: { recipient: string; priceUsdc: string; resource?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const proof =
    parsePaymentProofHeader(request.headers.get("X-Payment-Proof")) ||
    parsePaymentProofHeader(request.headers.get("X-PAYMENT"));

  if (!proof) {
    return { ok: false, error: "Missing payment proof" };
  }

  let requiredAmount: bigint;
  try {
    requiredAmount = BigInt(options.priceUsdc);
  } catch {
    return { ok: false, error: "Invalid price configuration" };
  }

  const verification = await verifyUsdcPaymentProof(proof, {
    recipient: options.recipient,
    requiredAmount,
  });

  if (!verification.valid) {
    return { ok: false, error: verification.error };
  }

  const resource = options.resource?.trim() || "platform-api";
  const replay = await consumePaymentReceipt(proof.transactionHash, resource);
  if (!replay.ok) {
    return { ok: false, error: replay.error };
  }

  return { ok: true };
}
