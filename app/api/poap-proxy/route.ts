import { NextResponse } from "next/server";
import { getCachedPoapAccessToken } from "@/lib/utils/poap-auth";

export async function GET(req: Request) {
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
    console.error("Error fetching POAP access token:", error);
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

export async function POST(req: Request) {
  // Example: get data from request body if needed
  // const { address, eventId } = await req.json()

  let accessToken: string;
  try {
    // Fetch access token from Auth0 using new endpoint
    accessToken = await getCachedPoapAccessToken();
  } catch (error) {
    console.error("Error fetching POAP access token:", error);
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
