import { NextRequest, NextResponse } from "next/server";
import { signWertSession, WertSessionPayload } from "@/lib/sdk/wert/sign";

export async function POST(req: NextRequest) {
  try {
    const { address, email } = await req.json();
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }
    const payload: WertSessionPayload = {
      partner_id: process.env.WERT_PARTNER_ID || "",
      address,
      email,
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
    return NextResponse.json(
      { error: "Failed to create Wert session" },
      { status: 500 }
    );
  }
}
