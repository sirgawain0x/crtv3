import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/sdk/supabase/service";
import { createClient } from "@/lib/sdk/supabase/server";
import { serverLogger } from "@/lib/utils/logger";
import { rateLimiters } from "@/lib/middleware/rateLimit";

// Forwards a viewer's message to the creator's externally-deployed Digital Twin
// chat endpoint and returns its reply. The twin agent itself is not built here —
// this is just a thin proxy so credentials and CORS stay server-side.
export async function POST(request: NextRequest) {
  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  let body: { creatorAddress?: string; streamId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { creatorAddress, streamId, message } = body;
  if (!creatorAddress || !message) {
    return NextResponse.json(
      { error: "creatorAddress and message are required" },
      { status: 400 }
    );
  }
  if (typeof message !== "string" || message.length > 1000) {
    return NextResponse.json(
      { error: "message must be a string under 1000 chars" },
      { status: 400 }
    );
  }

  const client = supabaseService ?? (await createClient());
  const { data: profile, error } = await client
    .from("creator_profiles")
    .select("twin_enabled, twin_chat_endpoint")
    .eq("owner_address", creatorAddress.toLowerCase())
    .maybeSingle();

  if (error) {
    serverLogger.error("twin/chat: profile lookup failed", error);
    return NextResponse.json(
      { error: "Failed to look up creator profile" },
      { status: 500 }
    );
  }

  if (!profile?.twin_enabled || !profile?.twin_chat_endpoint) {
    return NextResponse.json(
      { error: "This creator has no chat-enabled twin." },
      { status: 503 }
    );
  }

  try {
    const upstream = await fetch(profile.twin_chat_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        viewerAddress: null,
        streamId: streamId ?? null,
      }),
      // The twin's expected to respond quickly; cap at 20s so a slow agent
      // doesn't tie up our worker.
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      serverLogger.warn("twin/chat: upstream returned", upstream.status, text);
      return NextResponse.json(
        { error: "Twin endpoint returned an error." },
        { status: 502 }
      );
    }

    const ct = upstream.headers.get("content-type") || "";
    let reply: string;
    if (ct.includes("application/json")) {
      const json = await upstream.json();
      reply =
        typeof json?.reply === "string"
          ? json.reply
          : typeof json?.message === "string"
            ? json.message
            : typeof json?.content === "string"
              ? json.content
              : JSON.stringify(json);
    } else {
      reply = await upstream.text();
    }

    return NextResponse.json({ reply });
  } catch (err) {
    serverLogger.error("twin/chat: upstream fetch failed", err);
    return NextResponse.json(
      { error: "Twin is offline right now." },
      { status: 503 }
    );
  }
}
