import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/sdk/supabase/service";
import { createClient } from "@/lib/sdk/supabase/server";
import { serverLogger } from "@/lib/utils/logger";
import { rateLimiters } from "@/lib/middleware/rateLimit";

interface TwinChatBody {
  creatorAddress?: string;
  message?: string;
  streamId?: string;
}

export async function POST(request: NextRequest) {
  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  let body: TwinChatBody;
  try {
    body = (await request.json()) as TwinChatBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { creatorAddress, message, streamId } = body;
  if (!creatorAddress || !message) {
    return NextResponse.json(
      { success: false, error: "creatorAddress and message are required" },
      { status: 400 }
    );
  }

  // Look up the creator's twin endpoint.
  let endpoint: string | null = null;
  try {
    const supabase = supabaseService ?? (await createClient());
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("twin_chat_endpoint, twin_enabled")
      .eq("owner_address", creatorAddress.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    if (data?.twin_enabled && data.twin_chat_endpoint) {
      endpoint = data.twin_chat_endpoint;
    }
  } catch (err) {
    serverLogger.error("Twin endpoint lookup failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to look up twin endpoint" },
      { status: 500 }
    );
  }

  if (!endpoint) {
    return NextResponse.json(
      { success: false, error: "This creator has not configured a twin chat endpoint." },
      { status: 503 }
    );
  }

  // Forward to the agent's HTTP endpoint. The agent template documents a
  // simple JSON POST contract; we don't assume a specific response shape and
  // pass through whatever the endpoint returns.
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorAddress,
        viewerAddress: request.headers.get("x-viewer-address") || null,
        streamId: streamId || null,
        message,
      }),
      // Twin agents are external services; cap the wait to keep the UI snappy.
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: `Twin endpoint returned ${upstream.status}`,
          detail: text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    // Try JSON first, fall back to text. Either way, surface a `reply` field
    // so the panel has a single shape to render.
    const contentType = upstream.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await upstream.json();
      return NextResponse.json({ success: true, ...json, reply: json.reply ?? json.message ?? json.content ?? "" });
    }
    const text = await upstream.text();
    return NextResponse.json({ success: true, reply: text });
  } catch (err) {
    serverLogger.error("Twin endpoint request failed:", err);
    const msg = err instanceof Error ? err.message : "Twin endpoint unreachable";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 503 }
    );
  }
}
