import { NextRequest, NextResponse } from "next/server";
import { forwardPinataAgentChat } from "@/lib/pinata/chat";
import { requireHumanOrVerifiedBot } from "@/lib/middleware/botIdGuard";
import { getSongCupAgentConfig } from "@/lib/songchain/song-cup/agent-config";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { serverLogger } from "@/lib/utils/logger";

interface AgentChatBody {
  message?: string;
  session?: string;
}

export async function POST(request: NextRequest) {
  const botGuard = await requireHumanOrVerifiedBot("song-cup-agent-chat");
  if (!botGuard.allowed) return botGuard.response;

  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  const { enabled, baseUrl, gatewayToken } = getSongCupAgentConfig();
  if (!enabled || !baseUrl || !gatewayToken) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Song Cup agent is not configured. Set SONG_CUP_PINATA_AGENT_ID (or SONG_CUP_PINATA_BASE_URL) and SONG_CUP_PINATA_GATEWAY_TOKEN.",
      },
      { status: 503 },
    );
  }

  let body: AgentChatBody;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid body");
    }
    body = parsed as AgentChatBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json(
      { success: false, error: "message is required" },
      { status: 400 },
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { success: false, error: "message is too long" },
      { status: 400 },
    );
  }

  try {
    const result = await forwardPinataAgentChat({
      baseUrl,
      gatewayToken,
      message,
      session: body.session,
      signal: AbortSignal.timeout(30_000),
    });

    return NextResponse.json({
      success: true,
      reply: result.reply || "(no reply)",
      ...(result.session ? { session: result.session } : {}),
    });
  } catch (err) {
    serverLogger.error("Song Cup agent chat failed:", err);
    const msg = err instanceof Error ? err.message : "Agent unreachable";
    return NextResponse.json({ success: false, error: msg }, { status: 503 });
  }
}
