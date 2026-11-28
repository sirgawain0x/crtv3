import { NextRequest, NextResponse } from "next/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import {
  extractBearerToken,
  isPlatformApiAccessConfigured,
  getPlatformApiKeysFromEnv,
  matchPlatformApiKey,
} from "@/lib/middleware/platformApiKeys";
import {
  buildX402PaymentRequiredResponse,
  getX402PriceForResource,
  getX402Recipient,
  PLATFORM_API_CORS_HEADERS,
  verifyX402PaymentFromRequest,
} from "@/lib/middleware/x402Gate";
import { serverLogger } from "@/lib/utils/logger";
import { checkBotId } from "botid/server";

export type PlatformApiAccessTier = "admin" | "internal" | "x402" | "public";

export type PlatformApiAccessOptions = {
  resource: string;
  priceUsdc?: string;
};

export type PlatformApiAccessResult =
  | { allowed: true; tier: PlatformApiAccessTier; keyId?: string; paymentResponse?: string }
  | { allowed: false; response: NextResponse };

function unauthorizedResponse(message: string): NextResponse {
  return NextResponse.json(
    { error: message, code: "UNAUTHORIZED" },
    { status: 401, headers: PLATFORM_API_CORS_HEADERS },
  );
}

function mergePlatformApiHeaders(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(PLATFORM_API_CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new NextResponse(response.body, { status: response.status, headers });
}

/** Browser hint only; never sufficient authorization without BotID verification. */
export function isSameOriginAppRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== "same-origin") return false;
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}


/** Coarse classification of a BotID failure. Never includes the message or any token. */
function classifyBotIdFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/x-vercel-oidc-token.*missing|OIDC option/i.test(message)) return "oidc_missing";
  if (/Must be deployed on Vercel/i.test(message)) return "no_request_context";
  if (/Invalid checkLevel/i.test(message)) return "bad_check_level";
  if (error instanceof SyntaxError) return "botid_response_not_json";
  if (error instanceof TypeError) return "botid_fetch_failed";
  return "unclassified";
}

async function tryAllowSameOriginAppRequest(
  request: NextRequest,
  resource?: string,
): Promise<PlatformApiAccessResult | null> {
  if (!isSameOriginAppRequest(request)) {
    return null;
  }

  const rl =
    resource === 'playback.info'
      ? await rateLimiters.playbackInfo(request)
      : await rateLimiters.generous(request);
  if (rl) {
    return { allowed: false, response: mergePlatformApiHeaders(rl) };
  }

  try {
    const verification = await checkBotId({ advancedOptions: { checkLevel: "basic" } });
    if (verification.isHuman === true && verification.isBot === false &&
        !(verification.bypassed && process.env.NODE_ENV === "production")) {
      return { allowed: true, tier: "public" };
    }
  } catch (error) {
    // Diagnostic only: record why verification was unavailable without ever logging a credential.
    // The gate itself is unchanged - this still refuses with 503.
    serverLogger.warn("[platformApiAccess] Browser verification unavailable", {
      resource,
      errorName: error instanceof Error ? error.name : typeof error,
      reason: classifyBotIdFailure(error),
      oidcHeaderPresent: request.headers.get("x-vercel-oidc-token") !== null,
      oidcEnvPresent: Boolean(process.env.VERCEL_OIDC_TOKEN),
      vercelEnv: process.env.VERCEL_ENV ?? "unset",
    });
    return {
      allowed: false,
      response: NextResponse.json({ error: "Browser verification unavailable", code: "VERIFICATION_UNAVAILABLE" },
        { status: 503, headers: PLATFORM_API_CORS_HEADERS }),
    };
  }
  // Verified crawlers and spoofed browser headers must use authenticated or paid access.
  return null;
}

export async function requirePlatformApiAccess(
  request: NextRequest,
  options: PlatformApiAccessOptions,
): Promise<PlatformApiAccessResult> {
  if (!isPlatformApiAccessConfigured()) {
    return { allowed: true, tier: "public" };
  }

  const keys = getPlatformApiKeysFromEnv();
  const bearer = extractBearerToken(request.headers.get("authorization"));

  if (bearer) {
    const match = matchPlatformApiKey(bearer, keys);
    if (match && match.tier !== "partner") {
        const rl = await rateLimiters.apiKey(request, `${match.tier}:${match.keyId ?? "admin"}`);
        if (rl) {
          return {
            allowed: false,
            response: mergePlatformApiHeaders(rl),
          };
        }

      serverLogger.debug("[platformApiAccess] allowed", {
        tier: match.tier,
        keyId: match.keyId,
        resource: options.resource,
      });

      return { allowed: true, tier: match.tier, keyId: match.keyId };
    }

    if (!match) {
      // First-party private APIs also carry Privy bearer tokens. BotID verifies
      // the browser here; the handler still verifies the user's session.
      const browser = await tryAllowSameOriginAppRequest(request, options.resource);
      if (browser) return browser;
      if (!request.headers.has("PAYMENT-SIGNATURE")) {
        return { allowed: false, response: unauthorizedResponse("Invalid API key") };
      }
    }
  }

  const sameOriginResult = !bearer
    ? await tryAllowSameOriginAppRequest(request, options.resource)
    : null;
  if (sameOriginResult) {
    return sameOriginResult;
  }

  const recipient = getX402Recipient();
  const priceUsdc = options.priceUsdc ?? getX402PriceForResource(options.resource);

  if (!recipient || !/^[1-9][0-9]{0,77}$/.test(priceUsdc)) {
    return {
      allowed: false,
      response: NextResponse.json({ error: "Paid API access is temporarily unavailable", code: "PAYMENT_UNAVAILABLE" },
        { status: 503, headers: PLATFORM_API_CORS_HEADERS }),
    };
  }

  // Bound invalid-proof traffic before it can trigger receipt/block RPC reads.
  const paymentLimit = await rateLimiters.generous(request);
  if (paymentLimit) return { allowed: false, response: mergePlatformApiHeaders(paymentLimit) };

  const payment = await verifyX402PaymentFromRequest(request, {
    recipient,
    priceUsdc,
    resource: options.resource,
  });
  if (payment.ok) {
    serverLogger.debug("[platformApiAccess] x402 payment verified", {
      resource: options.resource,
    });
    return { allowed: true, tier: "x402", ...(payment.paymentResponse ? { paymentResponse: payment.paymentResponse } : {}) };
  }

  if (payment.error !== "Missing payment proof") {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: payment.error, code: "PAYMENT_INVALID" },
        { status: payment.unavailable ? 503 : 402, headers: PLATFORM_API_CORS_HEADERS },
      ),
    };
  }

  return {
    allowed: false,
    response: buildX402PaymentRequiredResponse({
      resource: options.resource,
      priceUsdc,
      recipient,
      requestUrl: request.url,
    }),
  };
}

export function platformApiOptionsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: PLATFORM_API_CORS_HEADERS,
  });
}
