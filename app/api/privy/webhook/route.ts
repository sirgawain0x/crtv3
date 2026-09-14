import { NextRequest, NextResponse } from "next/server";
import { getPrivyClient } from "@/lib/sdk/privy/client";
import { isPrivyWebhookConfigured } from "@/lib/sdk/privy/config";
import { serverLogger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
  if (!isPrivyWebhookConfigured()) {
    return NextResponse.json(
      { error: "Privy webhooks are not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing webhook signature headers" },
      { status: 401 },
    );
  }

  try {
    const event = getPrivyClient().webhooks().verify({
      payload: rawBody,
      headers: {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      },
    });

    serverLogger.info("Privy webhook received", { type: event.type });
    return NextResponse.json({ ok: true, type: event.type });
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }
}
