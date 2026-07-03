import { NextRequest, NextResponse } from "next/server";
import { forwardPinataAgentChat } from "@/lib/pinata/chat";
import {
  approveAllPendingDevices,
  ensureAgentRunning,
  getGatewayToken,
  PinataApiError,
  restartAgent,
} from "@/lib/pinata/api";
import { mapSongCupAgentError } from "@/lib/pinata/errors";
import { requireHumanOrVerifiedBot } from "@/lib/middleware/botIdGuard";
import { getSongCupAgentConfig } from "@/lib/songchain/song-cup/agent-config";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { serverLogger } from "@/lib/utils/logger";

interface AgentChatBody {
  message?: string;
  session?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveRuntimeRouting(config: ReturnType<typeof getSongCupAgentConfig>) {
  let baseUrl = config.baseUrl!;
  let gatewayToken = config.gatewayToken!;

  if (config.managementJwt && config.agentId) {
    await ensureAgentRunning(config.managementJwt, config.agentId);
    try {
      await approveAllPendingDevices(config.managementJwt, config.agentId);
    } catch (err) {
      serverLogger.warn("Song Cup agent device approve-all skipped:", err);
    }
    const gateway = await getGatewayToken(config.managementJwt, config.agentId);
    gatewayToken = gateway.token;
    // gateway.baseUrl points at pinclaw (WebSocket/internal); chat uses the public subdomain.
  }

  return { baseUrl, gatewayToken };
}

async function forwardWithRecovery(options: {
  baseUrl: string;
  gatewayToken: string;
  message: string;
  session?: string;
  devicePrivateKeyPem?: string | null;
  managementJwt?: string | null;
  agentId?: string | null;
}) {
  const {
    baseUrl,
    gatewayToken,
    message,
    session,
    devicePrivateKeyPem,
    managementJwt,
    agentId,
  } = options;

  const attempt = () =>
    forwardPinataAgentChat({
      baseUrl,
      gatewayToken,
      message,
      session,
      devicePrivateKeyPem,
      signal: AbortSignal.timeout(60_000),
    });

  try {
    return await attempt();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isRetryable =
      msg.toLowerCase().includes("pairing") ||
      msg.toLowerCase().includes("missing scope") ||
      msg.toLowerCase().includes("connect failed");

    if (!isRetryable || !managementJwt || !agentId) {
      throw err;
    }

    serverLogger.warn("Song Cup agent chat failed — restarting gateway and retrying");
    await restartAgent(managementJwt, agentId);
    await approveAllPendingDevices(managementJwt, agentId).catch((approveErr) => {
      serverLogger.warn("Song Cup agent approve-all after restart failed:", approveErr);
    });

    const deadline = Date.now() + 20_000;
    let lastErr: unknown = err;
    while (Date.now() < deadline) {
      await sleep(2_000);
      try {
        const gateway = await getGatewayToken(managementJwt, agentId);
        return await forwardPinataAgentChat({
          baseUrl,
          gatewayToken: gateway.token,
          message,
          session,
          devicePrivateKeyPem,
          signal: AbortSignal.timeout(60_000),
        });
      } catch (retryErr) {
        lastErr = retryErr;
      }
    }

    throw lastErr;
  }
}

export async function POST(request: NextRequest) {
  const botGuard = await requireHumanOrVerifiedBot("song-cup-agent-chat");
  if (!botGuard.allowed) return botGuard.response;

  const rl = await rateLimiters.standard(request);
  if (rl) return rl;

  const config = getSongCupAgentConfig();
  const {
    enabled,
    baseUrl,
    gatewayToken,
    agentId,
    managementJwt,
    devicePrivateKeyPem,
  } = config;
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
    const routing = await resolveRuntimeRouting(config);

    const result = await forwardWithRecovery({
      baseUrl: routing.baseUrl,
      gatewayToken: routing.gatewayToken,
      message,
      session: body.session,
      devicePrivateKeyPem,
      managementJwt,
      agentId,
    });

    return NextResponse.json({
      success: true,
      reply: result.reply || "(no reply)",
      ...(result.session ? { session: result.session } : {}),
    });
  } catch (err) {
    serverLogger.error("Song Cup agent chat failed:", err);
    const error = mapSongCupAgentError(err);
    return NextResponse.json({ success: false, error }, { status: 503 });
  }
}
