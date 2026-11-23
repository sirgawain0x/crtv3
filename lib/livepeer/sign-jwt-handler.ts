import { NextRequest, NextResponse } from 'next/server';
import { signAccessJwt } from "@livepeer/core/crypto";
import { getStreamByPlaybackId } from "@/services/streams";
import {
  requireWalletAuth,
  WalletAuthError,
} from "@/lib/auth/require-wallet";
import {
  checkMeTokenAccess,
  isMeTokenGateActive,
} from "@/lib/utils/metoken-access";
import { resolveVerifiedViewerAddresses } from "@/lib/utils/linked-identity";
import { serverLogger } from '@/lib/utils/logger';
import { resolveVideoProviderId } from '@/lib/video-provider/config';
import { signAuthorizedFrameworksPlaybackToken } from '@/lib/video-provider/frameworks/playback';
import { createServiceClient } from '@/lib/sdk/supabase/service';

async function signViewerToken(playbackId: string, subject: string): Promise<string> {
  if (resolveVideoProviderId() === 'frameworks') {
    const token = signAuthorizedFrameworksPlaybackToken({ playbackId, subject, expiresInSeconds: 3600 });
    if (!token) throw new Error('FrameWorks playback signing is unavailable');
    return token;
  }
  const privateKey = process.env.ACCESS_CONTROL_PRIVATE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_ACCESS_CONTROL_PUBLIC_KEY;
  if (!privateKey || !publicKey) throw new Error('Livepeer playback signing is unavailable');
  return signAccessJwt({ privateKey, publicKey, issuer: 'https://crtv3.app', playbackId,
    expiration: 3600, custom: { userId: subject } });
}


export async function handleSignJwt(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { playbackId, companionAddress } = body;

    if (!playbackId) {
      return NextResponse.json(
        { message: "Missing playbackId" },
        { status: 400 }
      );
    }

    if (typeof playbackId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(playbackId)) {
      return NextResponse.json({ message: 'Invalid playbackId' }, { status: 400 });
    }
    const stream = await getStreamByPlaybackId(playbackId);
    let resource = stream;
    if (!stream && resolveVideoProviderId() === 'frameworks') {
      const { data, error } = await createServiceClient().from('video_assets')
        .select('creator_id, requires_metoken, metoken_price, status')
        .eq('playback_id', playbackId).maybeSingle();
      if (error) return NextResponse.json({ message: 'Playback authorization unavailable' }, { status: 503 });
      if (!data || !['published', 'minted'].includes(data.status)) {
        return NextResponse.json({ message: 'Playback not found' }, { status: 404 });
      }
      resource = data;
    }

    if (
      !resource ||
      !isMeTokenGateActive(resource.requires_metoken, resource.metoken_price)
    ) {
      const token = await signViewerToken(playbackId, "anonymous");

      return NextResponse.json({ token }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const gatedStream = resource;
    const requiredAmount = gatedStream.metoken_price ?? 0;

    if (!gatedStream.creator_id) {
      return NextResponse.json(
        { message: "Stream creator not found" },
        { status: 400 }
      );
    }

    let verifiedViewerAddress: string;

    try {
      const verified = await requireWalletAuth(req);
      verifiedViewerAddress = verified.address;
    } catch (err) {
      if (err instanceof WalletAuthError) {
        const missingHeaders = err.message.includes("Missing wallet auth headers");
        const signingRejected =
          !missingHeaders &&
          (err.message.includes("Invalid wallet signature") ||
            err.message.includes("too old"));

        return NextResponse.json(
          {
            code: "METOKEN_REQUIRED",
            connectWallet: missingHeaders,
            signingRequired: signingRejected,
            creatorAddress: gatedStream.creator_id,
            required: String(requiredAmount),
            message: missingHeaders
              ? "Connect your wallet to verify MeToken balance"
              : err.message,
          },
          { status: 403 }
        );
      }
      throw err;
    }

    const viewerAddresses = await resolveVerifiedViewerAddresses(
      verifiedViewerAddress,
      companionAddress,
    );

    const access = await checkMeTokenAccess({
      viewerAddresses,
      creatorAddress: gatedStream.creator_id,
      requiredAmount,
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
          creatorAddress: gatedStream.creator_id,
          message:
            access.reason === "no_viewer_address"
              ? "Connect your wallet to verify MeToken balance"
              : "Insufficient MeToken balance to watch this stream",
        },
        { status: 403 }
      );
    }

    const token = await signViewerToken(playbackId, verifiedViewerAddress);

    return NextResponse.json({ token }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    serverLogger.error("Error signing JWT:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
