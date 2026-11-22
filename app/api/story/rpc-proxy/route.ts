import { withPlatformApiPaymentHeaders } from "@/lib/payments/payment-response";

import { requirePlatformApiAccess } from "@/lib/middleware/platformApiAccess";
import { NextRequest, NextResponse } from "next/server";
import { serverLogger } from "@/lib/utils/logger";

const RPC_PROXY_UPSTREAM_TIMEOUT_MS = 20_000;
const ALLOWED_RPC_METHODS = new Set([
  "eth_chainId", "eth_blockNumber", "eth_getBalance", "eth_getCode",
  "eth_getTransactionCount", "eth_call", "eth_estimateGas", "eth_gasPrice",
  "eth_maxPriorityFeePerGas", "eth_getTransactionByHash", "eth_getTransactionReceipt",
  "eth_sendRawTransaction", "net_version",
]);

/**
 * Return a JSON-RPC 2.0 error response so the client never parses empty/invalid JSON.
 */
function jsonRpcError(id: number | undefined, code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? 1, error: { code, message } },
    { status: code === -32000 ? 504 : 500 }
  );
}

/**
 * RPC Proxy for Story Protocol
 *
 * This endpoint proxies RPC requests to Story Protocol's RPC endpoint
 * without exposing the API key to the client-side code.
 *
 * Security:
 * - API key is stored server-side only (STORY_ALCHEMY_API_KEY, not NEXT_PUBLIC_)
 * - Client-side code calls this proxy instead of the RPC directly
 * - Basic BotID verifies browser access; external agents require payment.
 *   Sensitive actions (mint, transfer) use separate routes that are BotID-protected.
 */
export async function POST(request: NextRequest) {
  const access = await requirePlatformApiAccess(request, { resource: "rpc.story" });
  if (!access.allowed) return access.response;

  let body: { method?: string; params?: unknown; id?: number };
  try {
    const payload = await request.text();
    if (payload.length > 65_536) {
      return withPlatformApiPaymentHeaders(NextResponse.json({ error: "RPC payload too large" }, { status: 413 }), access);
    }
    body = JSON.parse(payload);
  } catch {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    ), access);
  }

  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.method !== "string" || !Array.isArray(body.params)) {
    return withPlatformApiPaymentHeaders(NextResponse.json(
      { error: "Invalid RPC request: method and params required" },
      { status: 400 }
    ), access);
  }

  const rpcId = body.id ?? 1;

  if (!ALLOWED_RPC_METHODS.has(body.method)) {
    return withPlatformApiPaymentHeaders(NextResponse.json({ error: "RPC method not allowed" }, { status: 403 }), access);
  }

  try {
    // Get server-side environment variables (not exposed to client)
    const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
    const storyAlchemyKey = process.env.STORY_ALCHEMY_API_KEY; // Server-only, no NEXT_PUBLIC_ prefix

    // Determine RPC URL
    let rpcUrl: string;

    if (process.env.STORY_RPC_URL) {
      rpcUrl = process.env.STORY_RPC_URL;
    } else if (storyAlchemyKey) {
      rpcUrl =
        network === "mainnet"
          ? `https://story-mainnet.g.alchemy.com/v2/${storyAlchemyKey}`
          : `https://story-testnet.g.alchemy.com/v2/${storyAlchemyKey}`;
    } else {
      rpcUrl =
        network === "mainnet"
          ? "https://rpc.story.foundation"
          : "https://rpc.aeneid.story.foundation";
      serverLogger.warn("⚠️ No STORY_ALCHEMY_API_KEY configured, using public RPC endpoint");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RPC_PROXY_UPSTREAM_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: rpcId,
          method: body.method,
          params: body.params,
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        serverLogger.warn("RPC proxy upstream timeout", { method: body.method });
        return withPlatformApiPaymentHeaders(jsonRpcError(rpcId, -32000, "Gateway timeout"), access);
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    const rawBody = await response.text();

    if (!response.ok) {
      serverLogger.error("RPC proxy error:", {
        status: response.status,
        statusText: response.statusText,
        error: rawBody.slice(0, 200),
        method: body.method,
      });
      return withPlatformApiPaymentHeaders(jsonRpcError(rpcId, -32000, response.statusText || "RPC request failed"), access);
    }

    let data: { jsonrpc?: string; id?: number; result?: unknown; error?: { code: number; message: string } };
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      serverLogger.error("RPC proxy: invalid JSON from upstream", { method: body.method });
      return withPlatformApiPaymentHeaders(jsonRpcError(rpcId, -32700, "Invalid JSON from upstream"), access);
    }

    if (data.error) {
      serverLogger.warn("RPC returned error:", { method: body.method, error: data.error });
    }

    return withPlatformApiPaymentHeaders(NextResponse.json(
      { jsonrpc: "2.0", id: data.id ?? rpcId, result: data.result, error: data.error }
    ), access);
  } catch (error) {
    serverLogger.error("RPC proxy error:", error);
    return withPlatformApiPaymentHeaders(jsonRpcError(rpcId, -32603, error instanceof Error ? error.message : "Internal server error"), access);
  }
}
