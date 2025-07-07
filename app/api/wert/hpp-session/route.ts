"use server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.WERT_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "WERT_API_KEY is not set" },
      { status: 500 }
    );

  const { walletAddress, amount, email } = await req.json();

  const response = await fetch(
    "https://partner.wert.io/api/external/hpp/create-session",
    {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        flow_type: "simple_full_restrict",
        wallet_address: walletAddress,
        commodity: "USDC",
        network: "base",
        commodity_amount: Number(amount),
        ...(email ? { email } : {}),
        currency: "USD",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: `Wert session creation failed: ${error}` },
      { status: 500 }
    );
  }

  const data = await response.json();
  return NextResponse.json({ sessionId: data.sessionId });
}
