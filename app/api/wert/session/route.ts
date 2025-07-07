import { NextRequest, NextResponse } from "next/server";
import { signWertSession, WertSessionPayload } from "@/lib/sdk/wert/sign";

export async function POST(req: NextRequest) {
  try {
    const { address, email, extra } = await req.json();
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }
    const payload: WertSessionPayload = {
      partner_id: process.env.NEXT_PUBLIC_WERT_PARTNER_ID || "",
      address,
      email,
      ...(extra ? { extra } : {}),
      // Add any other required fields here
    };
    if (!payload.partner_id) {
      return NextResponse.json(
        { error: "WERT_PARTNER_ID not set" },
        { status: 500 }
      );
    }
    const session = signWertSession(payload);
    return NextResponse.json({ session });
  } catch (err) {
    // Log the error for debugging
    console.error("Wert session error:", err);
    // In development, return the error message for easier debugging
    const isDev = process.env.NODE_ENV !== "production";
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: isDev
          ? `Failed to create Wert session: ${errorMsg}`
          : "Failed to create Wert session",
      },
      { status: 500 }
    );
  }
}
