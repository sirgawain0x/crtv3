import { signAccessJwt } from "@livepeer/core/crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { rateLimiters } from "@/lib/middleware/rateLimit";
import { getStreamByPlaybackId } from "@/services/streams";
import {
  requireWalletAuth,
  WalletAuthError,
} from "@/lib/auth/require-wallet";
import {
  checkMeTokenAccess,
  isMeTokenGateActive,
} from "@/lib/utils/metoken-access";

export async function POST(req: NextRequest) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const rl = await rateLimiters.standard(req);
  if (rl) return rl;

  try {
    const accessControlPrivateKey = process.env.ACCESS_CONTROL_PRIVATE_KEY;
    const accessControlPublicKey = process.env.NEXT_PUBLIC_ACCESS_CONTROL_PUBLIC_KEY;

    if (!accessControlPrivateKey || !accessControlPublicKey) {
      console.error("Missing Access Control Keys");
      return NextResponse.json(
        { message: "Server configuration error: Missing access keys" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { playbackId } = body;

    if (!playbackId) {
      return NextResponse.json(
        { message: "Missing playbackId" },
        { status: 400 }
      );
    }

    const stream = await getStreamByPlaybackId(playbackId);
    const gateActive = Boolean(
      stream &&
        isMeTokenGateActive(stream.requires_metoken, stream.metoken_price),
    );

    let verifiedViewerAddress: string | null = null;

    if (gateActive) {
      if (!stream!.creator_id) {
        return NextResponse.json(
          { message: "Stream creator not found" },
          { status: 400 }
        );
      }

      try {
        const verified = await requireWalletAuth(req);
        verifiedViewerAddress = verified.address;
      } catch (err) {
        if (err instanceof WalletAuthError) {
          const connectWallet =
            err.status === 401 &&
            err.message.includes("Missing wallet auth headers");
          return NextResponse.json(
            {
              code: "METOKEN_REQUIRED",
              connectWallet,
              creatorAddress: stream!.creator_id,
              required: String(stream!.metoken_price),
              message: connectWallet
                ? "Connect your wallet to verify MeToken balance"
                : err.message,
            },
            { status: 403 }
          );
        }
        throw err;
      }

      const access = await checkMeTokenAccess({
        viewerAddresses: [verifiedViewerAddress],
        creatorAddress: stream!.creator_id,
        requiredAmount: stream!.metoken_price!,
      });

      if (!access.allowed) {
        return NextResponse.json(
          {
            code: "METOKEN_REQUIRED",
            connectWallet: access.reason === "no_viewer_address",
            meTokenAddress: access.meTokenAddress,
            symbol: access.symbol,
            required: access.requiredFormatted,
            balance: access.balanceFormatted,
            creatorAddress: stream!.creator_id,
            message:
              access.reason === "no_viewer_address"
                ? "Connect your wallet to verify MeToken balance"
                : "Insufficient MeToken balance to watch this stream",
          },
          { status: 403 }
        );
      }
    }

    const token = await signAccessJwt({
      privateKey: accessControlPrivateKey,
      publicKey: accessControlPublicKey,
      issuer: "https://crtv3.app",
      playbackId,
      expiration: 3600,
      custom: {
        userId: verifiedViewerAddress ?? "anonymous",
      },
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error signing JWT:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
