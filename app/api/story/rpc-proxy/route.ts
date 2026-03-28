import { NextRequest, NextResponse } from "next/server";
import { serverLogger } from "@/lib/utils/logger";

const RPC_PROXY_UPSTREAM_TIMEOUT_MS = 20_000;

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
 * - Not protected by BotID so client-side RPC (e.g. eth_getBalance for funding wallet) works.
 *   Sensitive actions (mint, transfer) use separate routes that are BotID-protected.
 */
export async function POST(request: NextRequest) {
  let body: { method?: string; params?: unknown; id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (!body.method || body.params === undefined) {
    return NextResponse.json(
      { error: "Invalid RPC request: method and params required" },
      { status: 400 }
    );
  }

  const rpcId = body.id ?? 1;

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
        return jsonRpcError(rpcId, -32000, "Gateway timeout");
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
      return jsonRpcError(rpcId, -32000, response.statusText || "RPC request failed");
    }

    let data: { jsonrpc?: string; id?: number; result?: unknown; error?: { code: number; message: string } };
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      serverLogger.error("RPC proxy: invalid JSON from upstream", { method: body.method });
      return jsonRpcError(rpcId, -32700, "Invalid JSON from upstream");
    }

    if (data.error) {
      serverLogger.warn("RPC returned error:", { method: body.method, error: data.error });
    }

    return NextResponse.json(
      { jsonrpc: "2.0", id: data.id ?? rpcId, result: data.result, error: data.error }
    );
  } catch (error) {
    serverLogger.error("RPC proxy error:", error);
    return jsonRpcError(rpcId, -32603, error instanceof Error ? error.message : "Internal server error");
  }
}
