import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { serverLogger } from "@/lib/utils/logger";

/**
 * RPC Proxy for Story Protocol
 * 
 * This endpoint proxies RPC requests to Story Protocol's RPC endpoint
 * without exposing the API key to the client-side code.
 * 
 * Security:
 * - API key is stored server-side only (STORY_ALCHEMY_API_KEY, not NEXT_PUBLIC_)
 * - Client-side code calls this proxy instead of the RPC directly
 * - Rate limiting and authentication can be added here if needed
 */
export async function POST(request: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.method || !body.params) {
      return NextResponse.json(
        { error: "Invalid RPC request: method and params required" },
        { status: 400 }
      );
    }

    // Get server-side environment variables (not exposed to client)
    const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
    const storyAlchemyKey = process.env.STORY_ALCHEMY_API_KEY; // Server-only, no NEXT_PUBLIC_ prefix
    
    // Determine RPC URL
    let rpcUrl: string;
    
    if (process.env.STORY_RPC_URL) {
      // Use custom RPC URL if provided (server-only)
      rpcUrl = process.env.STORY_RPC_URL;
    } else if (storyAlchemyKey) {
      // Use Alchemy RPC with server-side API key
      rpcUrl = network === "mainnet"
        ? `https://story-mainnet.g.alchemy.com/v2/${storyAlchemyKey}`
        : `https://story-testnet.g.alchemy.com/v2/${storyAlchemyKey}`;
    } else {
      // Fallback to public endpoints
      rpcUrl = network === "mainnet"
        ? "https://rpc.story.foundation"
        : "https://rpc.aeneid.story.foundation";
      
      serverLogger.warn("⚠️ No STORY_ALCHEMY_API_KEY configured, using public RPC endpoint");
    }

    // Forward the RPC request
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: body.id || 1,
        method: body.method,
        params: body.params,
      }),
    });

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      serverLogger.error("RPC proxy error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        method: body.method,
      });
      
      return NextResponse.json(
        { 
          error: "RPC request failed",
          details: response.statusText,
          status: response.status 
        },
        { status: response.status }
      );
    }

    // Parse and return the response
    const data = await response.json();
    
    // Log errors for debugging (but don't expose sensitive info)
    if (data.error) {
      serverLogger.warn("RPC returned error:", {
        method: body.method,
        error: data.error,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    serverLogger.error("RPC proxy error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
