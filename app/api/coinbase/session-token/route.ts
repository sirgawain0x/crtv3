"use server";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * Coinbase CDP Session Token API
 * 
 * Generates a session token for Coinbase Onramp/Offramp using Secure Init.
 * 
 * Required Environment Variables:
 * - COINBASE_CDP_API_KEY_ID: Your CDP API Key ID
 * - COINBASE_CDP_API_KEY_SECRET: Your CDP Secret API Key
 * 
 * @see https://docs.cdp.coinbase.com/onramp-&-offramp/session-token-authentication
 */

interface SessionTokenRequest {
  address: string;
  assets?: string[]; // Optional: ["USDC", "ETH"] - Note: DAI not available on Base for onramp
  clientIp?: string; // Optional: Client IP for security validation
}

/**
 * Generate JWT token for Coinbase CDP API authentication
 * 
 * Coinbase CDP requires:
 * - Algorithm: ES256 (ECDSA with SHA-256)
 * - iss: "cdp"
 * - sub: API Key ID
 * - uri: The API endpoint URI
 * - exp: Expiration time
 * - nbf: Not before time
 * - aud: Should NOT be included for Onramp/Offramp tokens
 */
function generateJWT(): string {
  const apiKeyId = process.env.COINBASE_CDP_API_KEY_ID;
  const apiKeySecret = process.env.COINBASE_CDP_API_KEY_SECRET;

  if (!apiKeyId || !apiKeySecret) {
    throw new Error(
      "COINBASE_CDP_API_KEY_ID and COINBASE_CDP_API_KEY_SECRET must be set in environment variables"
    );
  }

  const now = Math.floor(Date.now() / 1000);
  
  // JWT payload for Coinbase CDP Onramp/Offramp
  // Note: aud claim should NOT be included for Onramp/Offramp tokens
  const payload = {
    sub: apiKeyId,
    iss: "cdp", // Must be "cdp" not "coinbase-cloud"
    uri: "https://api.developer.coinbase.com/onramp/v1/token", // Required URI field
    nbf: now - 5, // Not before (5 seconds ago)
    exp: now + 60, // Expires in 60 seconds
  };

  // Generate JWT using ES256 algorithm (ECDSA with SHA-256)
  // The API key secret should be in PEM format for ES256
  try {
    return jwt.sign(payload, apiKeySecret, {
      algorithm: "ES256", // Coinbase CDP requires ES256
    });
  } catch (error) {
    throw new Error(
      `Failed to generate JWT: ${error instanceof Error ? error.message : "Unknown error"}. ` +
      `Ensure your COINBASE_CDP_API_KEY_SECRET is a valid ECDSA private key in PEM format for ES256 algorithm.`
    );
  }
}

/**
 * Get client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default (not recommended for production)
  return "127.0.0.1";
}

export async function POST(req: NextRequest) {
  try {
    const body: SessionTokenRequest = await req.json();
    // Default to USDC and ETH - DAI is not available on Base for onramp
    // DAI is only available on: Ethereum, Avalanche C-Chain, Optimism, Arbitrum
    const { address, assets = ["USDC", "ETH"], clientIp } = body;
    
    // Filter out DAI since we're using Base network (DAI not supported on Base for onramp)
    const filteredAssets = (assets || []).filter(asset => 
      asset.toUpperCase() !== "DAI"
    );

    // Validate required fields
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Validate address format (basic Ethereum address check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      );
    }

    // Get client IP (required for security validation)
    const ip = clientIp || getClientIp(req);

    // Generate JWT token
    let jwtToken: string;
    try {
      jwtToken = generateJWT();
    } catch (error) {
      console.error("JWT generation error:", error);
      return NextResponse.json(
        {
          error:
            "Failed to generate authentication token. Please check your CDP API key configuration.",
        },
        { status: 500 }
      );
    }

    // Prepare addresses array for Coinbase API
    // Base network is the primary network we support
    // Note: DAI is NOT available on Base for onramp (only on Ethereum, Avalanche C-Chain, Optimism, Arbitrum)
    const addresses = [
      {
        address: address,
        blockchains: ["base"], // Base network supports USDC and ETH for onramp
      },
    ];

    // Use filtered assets or default to USDC and ETH (DAI not supported on Base for onramp)
    const finalAssets = filteredAssets.length > 0 ? filteredAssets : ["USDC", "ETH"];

    // Call Coinbase Session Token API
    const response = await fetch(
      "https://api.developer.coinbase.com/onramp/v1/token",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwtToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addresses: addresses,
          assets: finalAssets, // USDC and ETH only for Base (DAI not available)
          clientIp: ip, // Required for security validation
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Coinbase API error:", errorText);
      
      let errorMessage = "Failed to create session token";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return session token
    return NextResponse.json({
      sessionToken: data.data?.token || data.token,
      channelId: data.data?.channel_id || data.channel_id,
    });
  } catch (error) {
    console.error("Session token error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create session token",
      },
      { status: 500 }
    );
  }
}

