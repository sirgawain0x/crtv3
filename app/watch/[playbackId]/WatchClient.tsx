"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useInterval } from "@/lib/hooks/useInterval";
import { Player } from "@/components/Player/Player";
import { getDetailPlaybackSource } from "@/lib/hooks/livepeer/useDetailPlaybackSources";
import { getStreamByPlaybackId } from "@/services/streams";
import { LiveTokenPanel } from "@/components/Live/LiveTokenPanel";
import { LiveChat } from "@/components/Live/LiveChat";
import { ClipCreator } from "@/components/Live/ClipCreator";
import { DigitalTwinOverlay } from "@/components/Live/DigitalTwinOverlay";
import { Src } from "@livepeer/react";
import { useUser } from "@/lib/wallet/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import {
  LiveStreamMeTokenGate,
  type LiveStreamGateInfo,
} from "@/components/Live/LiveStreamMeTokenGate";
import Link from "next/link";
import { RealtimeViewsComponent } from "@/components/Player/RealtimeViewsComponent";
import { ViewsComponent } from "@/components/Player/ViewsComponent";
import { useLivepeerRealtimeMetrics } from "@/lib/hooks/livepeer/useLivepeerRealtimeMetrics";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash } from "lucide-react";
import { logger } from '@/lib/utils/logger';
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { formatWalletAuthError } from "@/lib/auth/format-wallet-auth-error";
import { isMeTokenGateActive } from "@/lib/utils/metoken-access";


import { MeTokenShareButton } from "@/components/Market/MeTokenShareButton";
import { TokenMarketData } from "@/lib/services/market";

interface WatchClientProps {
  initialMarketData?: TokenMarketData | null;
  tokenInfo?: {
    address: string;
    symbol: string;
    name: string;
    decimals?: number;
  } | null;
  videoTitle?: string;
  storyIpId?: string | null;
  storyIpRegistered?: boolean;
}

type StreamStatus =
  | { kind: "loading" }
  | { kind: "live"; sources: Src[] }
  | { kind: "metoken-gated"; gate: LiveStreamGateInfo; sources: Src[] }
  | { kind: "offline-temporary"; attempts: number }
  | { kind: "offline-permanent" }
  | { kind: "not-found" }
  | { kind: "error"; userMessage: string };

const MAX_OFFLINE_POLL_ATTEMPTS = 20; // 20 × 15s ≈ 5 minutes

function sanitizeStreamError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("abort")) {
      return "Request cancelled.";
    }
  }
  return "We couldn't load this stream. Please try again in a moment.";
}

const STORY_SCAN_IP_BASE = process.env.NEXT_PUBLIC_STORY_NETWORK === "mainnet"
  ? "https://www.storyscan.io"
  : "https://aeneid.storyscan.io";

export default function WatchClient({ initialMarketData, tokenInfo, videoTitle, storyIpId, storyIpRegistered }: WatchClientProps) {
  const params = useParams();
  const playbackId = Array.isArray(params.playbackId)
    ? params.playbackId[0]
    : params.playbackId;

  const { viewerCount } = useLivepeerRealtimeMetrics(playbackId ?? "");

  const user = useUser();
  const { address: smartAccountAddress } = useModularAccount();
  const { getAuthHeaders, address: authAddress } = useWalletAuth();
  const [status, setStatus] = useState<StreamStatus>({ kind: "loading" });
  const [streamData, setStreamData] = useState<import("@/services/streams").Stream | null>(null);
  const [jwt, setJwt] = useState<string | undefined>(undefined);
  const [isChecking, setIsChecking] = useState(false);
  const [gatePrefetch, setGatePrefetch] = useState<LiveStreamGateInfo | null>(null);
  const streamDataRef = useRef(streamData);
  streamDataRef.current = streamData;
  const gatePrefetchRef = useRef(gatePrefetch);
  gatePrefetchRef.current = gatePrefetch;

  const isGateLikelyActive = useCallback(() => {
    const stream = streamDataRef.current;
    if (
      stream &&
      isMeTokenGateActive(stream.requires_metoken, stream.metoken_price)
    ) {
      return true;
    }
    return Boolean(gatePrefetchRef.current?.code === "METOKEN_REQUIRED");
  }, []);

  const buildCompanionAddress = useCallback((): string | undefined => {
    if (!authAddress) return undefined;
    const verified = authAddress.toLowerCase();
    const eoa = user?.address?.toLowerCase();
    const sca = smartAccountAddress?.toLowerCase();
    if (eoa && eoa !== verified) return eoa;
    if (sca && sca !== verified) return sca;
    return undefined;
  }, [authAddress, user?.address, smartAccountAddress]);

  const requestStreamJwt = useCallback(async (): Promise<{
    ok: boolean;
    token?: string;
    gate?: LiveStreamGateInfo;
  }> => {
    if (!playbackId) {
      return { ok: false };
    }

    const gateActive = isGateLikelyActive();
    const streamName =
      streamDataRef.current?.name ?? gatePrefetchRef.current?.streamName ?? null;
    const gateBase: LiveStreamGateInfo = {
      code: "METOKEN_REQUIRED",
      streamName,
      creatorAddress:
        streamDataRef.current?.creator_id ??
        gatePrefetchRef.current?.creatorAddress,
      symbol: gatePrefetchRef.current?.symbol,
      required:
        streamDataRef.current?.metoken_price != null
          ? String(streamDataRef.current.metoken_price)
          : gatePrefetchRef.current?.required,
    };

    if (gateActive && !user?.address && !smartAccountAddress) {
      return {
        ok: false,
        gate: {
          ...gateBase,
          connectWallet: true,
          message: "Connect your wallet to verify MeToken balance",
        },
      };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const body: { playbackId: string; companionAddress?: string } = {
      playbackId,
    };

    if (gateActive && (user?.address || smartAccountAddress)) {
      try {
        Object.assign(headers, await getAuthHeaders());
        const companion = buildCompanionAddress();
        if (companion) {
          body.companionAddress = companion;
        }
      } catch (authErr) {
        logger.warn("Wallet auth unavailable for stream JWT:", authErr);
        const walletConnected = Boolean(user?.address || smartAccountAddress);
        return {
          ok: false,
          gate: {
            ...gateBase,
            connectWallet: !walletConnected,
            signingRequired: walletConnected,
            message: formatWalletAuthError(authErr),
          },
        };
      }
    }

    const jwtRes = await fetch("/api/livepeer/sign-jwt", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (jwtRes.ok) {
      const { token } = await jwtRes.json();
      return { ok: true, token };
    }

    const errData = await jwtRes.json().catch(() => ({}));
    if (jwtRes.status === 403 && errData.code === "METOKEN_REQUIRED") {
      return {
        ok: false,
        gate: {
          code: errData.code,
          connectWallet: errData.connectWallet,
          signingRequired: errData.signingRequired,
          message: errData.message,
          meTokenAddress: errData.meTokenAddress,
          symbol: errData.symbol,
          required: errData.required,
          balance: errData.balance,
          creatorAddress: errData.creatorAddress,
          streamName,
        },
      };
    }

    logger.warn("Failed to sign JWT for stream:", errData);
    return { ok: false };
  }, [
    playbackId,
    user?.address,
    smartAccountAddress,
    authAddress,
    getAuthHeaders,
    isGateLikelyActive,
    buildCompanionAddress,
  ]);

  const fetchPlaybackSources = useCallback(async (isInitial = false) => {
    if (!playbackId) {
      setStatus({ kind: "error", userMessage: "No playback ID provided." });
      return;
    }

    try {
      if (isInitial) setStatus({ kind: "loading" });
      setIsChecking(true);

      // Parallel fetch: Livepeer sources + our persistent stream metadata.
      // Using allSettled so a DB blip doesn't tank the whole classification.
      const [sourcesResult, streamRecordResult] = await Promise.allSettled([
        getDetailPlaybackSource(playbackId),
        getStreamByPlaybackId(playbackId),
      ]);

      const sources = sourcesResult.status === "fulfilled" ? sourcesResult.value : null;
      const streamRecord = streamRecordResult.status === "fulfilled"
        ? streamRecordResult.value
        : null;

      if (sourcesResult.status === "rejected") {
        logger.error("Playback source fetch failed:", sourcesResult.reason);
      }
      if (streamRecordResult.status === "rejected") {
        logger.error("Stream DB fetch failed:", streamRecordResult.reason);
      }

      if (streamRecord) {
        setStreamData(streamRecord as import("@/services/streams").Stream);
      }

      // Happy path — stream is live; JWT required for playback.
      if (sources && sources.length > 0) {
        try {
          const jwtResult = await requestStreamJwt();
          if (jwtResult.ok && jwtResult.token) {
            setJwt(jwtResult.token);
            setStatus({ kind: "live", sources });
          } else if (jwtResult.gate) {
            setJwt(undefined);
            setStatus({ kind: "metoken-gated", gate: jwtResult.gate, sources });
          } else {
            setJwt(undefined);
            setStatus({ kind: "live", sources });
          }
        } catch (jwtErr) {
          logger.error("Error signing JWT:", jwtErr);
          setStatus({ kind: "live", sources });
        }
        return;
      }

      // No sources — classify.
      if (!streamRecord && !videoTitle) {
        setStatus({ kind: "not-found" });
        return;
      }

      // Stream known to us but currently not live — temporary, escalate after cap.
      setStatus((prev) => {
        const nextAttempts = prev.kind === "offline-temporary" ? prev.attempts + 1 : 1;
        if (nextAttempts >= MAX_OFFLINE_POLL_ATTEMPTS) {
          return { kind: "offline-permanent" };
        }
        return { kind: "offline-temporary", attempts: nextAttempts };
      });
    } catch (err) {
      logger.error("Error fetching playback sources:", err);
      setStatus({ kind: "error", userMessage: sanitizeStreamError(err) });
    } finally {
      setIsChecking(false);
    }
  }, [playbackId, user?.address, smartAccountAddress, videoTitle, requestStreamJwt]);

  useEffect(() => {
    if (!playbackId) return;

    fetch(`/api/streams/access/${encodeURIComponent(playbackId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.requiresMetoken) return;
        setGatePrefetch({
          code: "METOKEN_REQUIRED",
          creatorAddress: data.creatorAddress,
          symbol: data.meTokenSymbol ?? undefined,
          required: data.metokenPrice != null ? String(data.metokenPrice) : undefined,
          streamName: data.streamName,
        });
      })
      .catch((err) => logger.warn("Failed to prefetch stream gate metadata:", err));
  }, [playbackId]);

  const retryAfterGate = useCallback(async () => {
    if (status.kind !== "metoken-gated") return;
    setIsChecking(true);
    try {
      const jwtResult = await requestStreamJwt();
      if (jwtResult.ok && jwtResult.token) {
        setJwt(jwtResult.token);
        setStatus({ kind: "live", sources: status.sources });
      } else if (jwtResult.gate) {
        setStatus({ kind: "metoken-gated", gate: jwtResult.gate, sources: status.sources });
      }
    } finally {
      setIsChecking(false);
    }
  }, [status, requestStreamJwt]);

  const prevWalletKeyRef = useRef("");
  useEffect(() => {
    const walletKey = `${user?.address ?? ""}:${smartAccountAddress ?? ""}`;
    if (status.kind !== "metoken-gated") {
      prevWalletKeyRef.current = walletKey;
      return;
    }
    if (walletKey === prevWalletKeyRef.current) return;
    prevWalletKeyRef.current = walletKey;
    if (!user?.address && !smartAccountAddress) return;
    void retryAfterGate();
  }, [user?.address, smartAccountAddress, status.kind, retryAfterGate]);

  // Initial fetch
  useEffect(() => {
    fetchPlaybackSources(true);
  }, [fetchPlaybackSources]);

  // Auto-poll every 15 seconds only while the stream is temporarily offline.
  useInterval(
    useCallback(() => fetchPlaybackSources(false), [fetchPlaybackSources]),
    status.kind === "offline-temporary" ? 15000 : null
  );

  // Generate a consistent sessionId based on playbackId so viewers share the same chat session.
  const sessionId = playbackId ? `session-${playbackId}` : "";
  const streamId = playbackId || "";

  const showThumbnail = !!streamData?.thumbnail_url && status.kind !== "not-found";

  return (
    <div className="min-h-screen p-6">
      <div className="my-5 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">
                  <span role="img" aria-label="home">
                    🏠
                  </span>{" "}
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/discover">
                  Discover
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Live Stream</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="max-w-7xl mx-auto">
        {(storyIpRegistered && storyIpId) && (
          <div className="mb-4 p-3 rounded-lg border bg-muted/50">
            <p className="text-sm font-medium text-muted-foreground">Registered as IP Asset</p>
            <p className="text-xs font-mono mt-1 truncate" title={storyIpId}>{storyIpId}</p>
            <a
              href={`${STORY_SCAN_IP_BASE}/ip/${storyIpId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              View on Story Protocol →
            </a>
          </div>
        )}
        {tokenInfo && (
          <div className="flex justify-end mb-4">
            <MeTokenShareButton
              address={tokenInfo.address}
              symbol={tokenInfo.symbol}
              name={tokenInfo.name}
              type="content"
              playbackId={playbackId as string}
            />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2 relative">
            {streamData?.creator_id && (
              <DigitalTwinOverlay creatorAddress={streamData.creator_id} />
            )}
            {status.kind === "loading" && (
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            )}

            {status.kind === "metoken-gated" && (
              <LiveStreamMeTokenGate
                gate={status.gate}
                playbackId={playbackId as string}
                streamTitle={videoTitle || streamData?.name || status.gate.streamName}
                thumbnailUrl={streamData?.thumbnail_url}
                onAccessGranted={() => void retryAfterGate()}
              />
            )}

            {status.kind === "live" && (
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <Player
                    src={status.sources}
                    playbackId={playbackId}
                    title={videoTitle || streamData?.name || "Live Stream"}
                    jwt={jwt}
                  />
                </div>
                {/* Live Stream Viewership Stats */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 backdrop-blur border border-slate-800">
                  <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-white truncate max-w-lg">
                      {videoTitle || streamData?.name || "Live Stream"}
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                      Broadcasting Live
                    </p>
                  </div>
                  {/* Total + realtime concurrent viewers */}
                  <div className="flex items-center gap-4">
                    {playbackId && <ViewsComponent playbackId={playbackId} />}
                    {playbackId && <RealtimeViewsComponent playbackId={playbackId} />}
                  </div>
                </div>
              </div>
            )}

            {status.kind === "offline-temporary" && (
              <FallbackShell showThumbnail={showThumbnail} thumbnailUrl={streamData?.thumbnail_url}>
                <AlertCircle className="h-10 w-10 text-gray-400" />
                <h3 className="text-xl font-bold text-white">Stream is Offline</h3>
                <p className="text-gray-300">The broadcaster will be back soon.</p>
                <p className="text-xs text-gray-500 mt-1">Auto-checking every 15 seconds...</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <button
                    onClick={() => fetchPlaybackSources(false)}
                    disabled={isChecking}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors font-medium border border-white/20 disabled:opacity-50"
                  >
                    {isChecking ? "Checking..." : "Check Now"}
                  </button>
                  <Link
                    href="/discover"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors font-medium border border-white/20"
                  >
                    Browse Live Streams
                  </Link>
                </div>
              </FallbackShell>
            )}

            {status.kind === "offline-permanent" && (
              <FallbackShell showThumbnail={showThumbnail} thumbnailUrl={streamData?.thumbnail_url}>
                <AlertCircle className="h-10 w-10 text-gray-400" />
                <h3 className="text-xl font-bold text-white">Stream has ended</h3>
                <p className="text-gray-300">This broadcast is no longer live.</p>
                <p className="text-xs text-gray-500 mt-1">Catch the next one on Discover.</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <Link
                    href="/discover"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors font-medium border border-white/20"
                  >
                    Browse Live Streams
                  </Link>
                </div>
              </FallbackShell>
            )}

            {status.kind === "not-found" && (
              <FallbackShell showThumbnail={false}>
                <AlertCircle className="h-10 w-10 text-gray-400" />
                <h3 className="text-xl font-bold text-white">Stream not found</h3>
                <p className="text-gray-300">This link may be incorrect or the stream was removed.</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <Link
                    href="/"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors font-medium border border-white/20"
                  >
                    Back to Home
                  </Link>
                  <Link
                    href="/discover"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors font-medium border border-white/20"
                  >
                    Browse Live Streams
                  </Link>
                </div>
              </FallbackShell>
            )}

            {status.kind === "error" && (
              <FallbackShell showThumbnail={showThumbnail} thumbnailUrl={streamData?.thumbnail_url}>
                <AlertCircle className="h-10 w-10 text-red-400" />
                <h3 className="text-xl font-bold text-white">Unable to load stream</h3>
                <p className="text-gray-300">{status.userMessage}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <button
                    onClick={() => fetchPlaybackSources(true)}
                    disabled={isChecking}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors font-medium border border-white/20 disabled:opacity-50"
                  >
                    {isChecking ? "Trying..." : "Try again"}
                  </button>
                  <Link
                    href="/discover"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors font-medium border border-white/20"
                  >
                    Browse Live Streams
                  </Link>
                </div>
              </FallbackShell>
            )}
          </div>

          {/* Live Chat Section */}
          <div className="lg:col-span-1 space-y-4">
            {playbackId && sessionId && streamData?.creator_id && (
              <LiveTokenPanel
                creatorAddress={streamData.creator_id}
                creatorMeToken={tokenInfo ?? undefined}
                streamId={streamId}
                sessionId={sessionId}
              />
            )}
            {playbackId && sessionId ? (
              <LiveChat
                streamId={streamId}
                sessionId={sessionId}
                creatorAddress={streamData?.creator_id ?? null}
                viewerCount={viewerCount}
              />
            ) : (
              <div className="border rounded-lg p-4 text-sm text-muted-foreground">
                Loading chat...
              </div>
            )}
          </div>
        </div>

        {/* Clip Creator Section - Below video and chat for viewers */}
        {playbackId && sessionId && (
          <div className="mt-6">
            <ClipCreator
              playbackId={playbackId}
              sessionId={sessionId}
              allowClipping={streamData?.allow_clipping ?? true}
              parentStoryIpId={streamData?.story_ip_id ?? storyIpId ?? null}
              parentCommercialRevShare={streamData?.story_commercial_rev_share ?? null}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FallbackShell({
  children,
  showThumbnail,
  thumbnailUrl,
}: {
  children: ReactNode;
  showThumbnail: boolean;
  thumbnailUrl?: string | null;
}) {
  return (
    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-center relative">
      {showThumbnail && thumbnailUrl && (
        <div className="absolute inset-0 z-0 opacity-50">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="z-10 flex flex-col items-center gap-2 p-6 bg-black/60 rounded-xl backdrop-blur-sm text-center max-w-md">
        {children}
      </div>
    </div>
  );
}
