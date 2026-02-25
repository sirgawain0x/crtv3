import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { getCachedPoapAccessToken } from "@/lib/utils/poap-auth";
import { serverLogger } from "@/lib/utils/logger";
import { rateLimiters } from "@/lib/middleware/rateLimit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const proposalId = searchParams.get("proposalId");
  if (!proposalId)
    return NextResponse.json({ error: "Missing proposalId" }, { status: 400 });
  // Snapshot proposal IDs are hex strings (0x...), not just numbers
  // Remove the validation that only accepts numbers

  let accessToken: string;
  try {
    // Fetch access token from Auth0 using new endpoint
    accessToken = await getCachedPoapAccessToken();
  } catch (error) {
    serverLogger.error("Error fetching POAP access token:", error);
    // Return a more descriptive error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to authenticate with POAP API",
        details: errorMessage,
        hint: "POAP_CLIENT_ID and POAP_CLIENT_SECRET must be configured, and the Auth0 client must be authorized for the POAP API audience (https://api.poap.tech)."
      },
      { status: 500 }
    );
  }

  const url = `https://api.poap.tech/snapshot/proposal/${proposalId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-API-Key": process.env.POAP_API_KEY ?? "",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch POAP data" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.generous(req);
  if (rl) return rl;

  // Example: get data from request body if needed
  // const { address, eventId } = await req.json()

  let accessToken: string;
  try {
    // Fetch access token from Auth0 using new endpoint
    accessToken = await getCachedPoapAccessToken();
  } catch (error) {
    serverLogger.error("Error fetching POAP access token:", error);
    return NextResponse.json(
      { error: "Failed to authenticate with POAP API" },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.poap.tech/actions/claim-qr", {
    method: "GET", // or "POST" if required by the endpoint
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "X-API-Key": process.env.POAP_API_KEY ?? "",
    },
    // body: JSON.stringify({ ... }) // if POST and body required
  });

  if (!res.ok)
    return NextResponse.json(
      { error: "Failed to claim POAP QR" },
      { status: res.status }
    );

  const data = await res.json();
  return NextResponse.json(data);
}
