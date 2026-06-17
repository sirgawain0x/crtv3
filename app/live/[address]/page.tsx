"use client";
import { useState, useEffect, useRef } from "react";
import { Broadcast, createStreamViaProxy, fetchStreamKeyForCreator } from "@/components/Live/Broadcast";
import { updateStream } from "@/services/streams";
import { useUser } from "@account-kit/react";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slash, VideoIcon, Share2, ShieldCheck, Radio } from "lucide-react";
import { useCreatorLiveStream } from "@/hooks/useCreatorLiveStream";
import { SongchainShareLiveDialog } from "@/components/songchain/SongchainShareLiveDialog";
import { FaExclamationTriangle } from "react-icons/fa";
import { MembershipGuard } from "@/components/auth/MembershipGuard";
import { ProfilePageGuard } from "@/components/UserProfile/UserProfile";
import { MultistreamTargetsForm } from "@/components/Live/multicast/MultistreamTargetsForm";
import { MultistreamTargetsList } from "@/components/Live/multicast/MultistreamTargetList";
import {
  listMultistreamTargets,
  MultistreamTarget,
} from "@/services/video-assets";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LivestreamThumbnail } from "@/components/Live/LivestreamThumbnail";
import { StreamThumbnailUploader } from "@/components/Live/StreamThumbnailUploader";
import { StreamNameEditor } from "@/components/Live/StreamNameEditor";
import { StreamMeTokenGateEditor } from "@/components/Live/StreamMeTokenGateEditor";
import { StreamIPRegistration } from "@/components/Live/StreamIPRegistration";
import { CreatorClipsList } from "@/components/Live/CreatorClipsList";
import { getThumbnailUrl } from "@/services/livepeer-thumbnails";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LiveChat } from "@/components/Live/LiveChat";
import { ShareDialog } from "@/components/Videos/ShareDialog";
import { ModeratorsDialog } from "@/components/Live/ModeratorsDialog";
import { DigitalTwinOverlay } from "@/components/Live/DigitalTwinOverlay";
import { logger } from '@/lib/utils/logger';


export default function LivePage() {
  const user = useUser();
  const { getAuthHeaders } = useWalletAuth();
  const isConnected = !!user?.address;
  const [multistreamTargets, setMultistreamTargets] = useState<
    MultistreamTarget[]
  >([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const { address: addressParam } = useParams();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [streamCreateError, setStreamCreateError] = useState<string | null>(
    null
  );
  const [allowClipping, setAllowClipping] = useState(true);
  const [isUpdatingClipPref, setIsUpdatingClipPref] = useState(false);
  const [streamName, setStreamName] = useState<string | null>(null);
  const [requiresMetoken, setRequiresMetoken] = useState(false);
  const [metokenPrice, setMetokenPrice] = useState<number | null>(null);
  const [storyIpId, setStoryIpId] = useState<string | null>(null);
  const [storyLicenseTermsId, setStoryLicenseTermsId] = useState<string | null>(null);
  const [storyRevShare, setStoryRevShare] = useState<number | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [songchainShareOpen, setSongchainShareOpen] = useState(false);
  const [moderatorsDialogOpen, setModeratorsDialogOpen] = useState(false);
  const { stream: liveStream, isLive: isStreamLive } = useCreatorLiveStream(15_000);
  const songchainFeedId =
    process.env.NEXT_PUBLIC_SONGCHAIN_FEED_ID?.trim() || null;
  const recordingEnableRequestedRef = useRef<Set<string>>(new Set());

  // Match the viewer-side derivation in WatchClient so host + viewers share the
  // same XMTP group ID.
  const chatStreamId = playbackId || "";
  const chatSessionId = playbackId ? `session-${playbackId}` : "";


  // Fetch existing stream and multistream targets
  useEffect(() => {
    async function fetchStreamAndTargets() {
      if (!user?.address) return;

      try {
        const authHeaders = await getAuthHeaders();
        const streamRes = await fetch(
          `/api/streams/creator/${encodeURIComponent(user.address)}`,
        );

        let currentStreamId: string | null = null;

        if (streamRes.ok) {
          const stream = await streamRes.json();
          currentStreamId = stream.stream_id ?? null;
          setStreamId(stream.stream_id);
          setPlaybackId(stream.playback_id);
          setThumbnailUrl(stream.thumbnail_url || null);
          setAllowClipping(stream.allow_clipping ?? true);
          setStreamName(stream.name ?? null);
          setRequiresMetoken(stream.requires_metoken ?? false);
          setMetokenPrice(stream.metoken_price ?? null);
          setStoryIpId(stream.story_ip_id ?? null);
          setStoryLicenseTermsId(stream.story_license_terms_id ?? null);
          setStoryRevShare(stream.story_commercial_rev_share ?? null);

          try {
            const keyData = await fetchStreamKeyForCreator(user.address, authHeaders);
            setStreamKey(keyData.streamKey);
          } catch (keyErr) {
            logger.error("Failed to fetch stream key:", keyErr);
          }

          if (currentStreamId && !recordingEnableRequestedRef.current.has(currentStreamId)) {
            recordingEnableRequestedRef.current.add(currentStreamId);
            fetch(`/api/livepeer/stream/${encodeURIComponent(currentStreamId)}/recording`, {
              method: "POST",
            }).catch((err) => logger.error("Failed to enable stream recording:", err));
          }
        } else if (streamRes.status !== 404) {
          logger.error("Error fetching stream metadata:", await streamRes.text());
        }

        // 2. Fetch multistream targets for the persisted stream
        if (!currentStreamId) {
          setMultistreamTargets([]);
          return;
        }

        setIsLoadingTargets(true);
        const result = await listMultistreamTargets({ streamId: currentStreamId });
        setIsLoadingTargets(false);
        if (result.targets) {
          setMultistreamTargets(result.targets);
        } else if (result.error) {
          logger.error("Error fetching multistream targets:", result.error);
        }
      } catch (err) {
        logger.error("Error fetching stream data:", err);
      }
    }

    fetchStreamAndTargets();
  }, [user?.address]);

  useEffect(() => {
    async function fetchThumbnail() {
      if (!addressParam) return;

      const id = Array.isArray(addressParam) ? addressParam[0] : addressParam;

      // Skip thumbnail fetch if streamId is an Ethereum address
      // Livepeer playback IDs don't start with 0x
      if (id.startsWith('0x')) {
        setThumbnailLoading(false);
        setThumbnailError(null);
        setThumbnailUrl(null);
        return;
      }

      setThumbnailLoading(true);
      setThumbnailError(null);
      const res = (await getThumbnailUrl({
        playbackId: id,
      })) as import("@/lib/types/actions").ActionResponse<{
        thumbnailUrl: string;
      }>;
      if (res.success && res.data?.thumbnailUrl)
        setThumbnailUrl(res.data.thumbnailUrl);
      else setThumbnailError(res.error || "Thumbnail not found");
      setThumbnailLoading(false);
    }
    fetchThumbnail();
  }, [addressParam]);

  function handleTargetAdded(target: MultistreamTarget) {
    setMultistreamTargets((prev) => [...prev, target]);
  }

  function handleTargetRemoved(id: string) {
    setMultistreamTargets((prev) => prev.filter((t) => t.id !== id));
  }

  function handleThumbnailUpdated(url: string) {
    setThumbnailUrl(url);
  }

  function handleNameUpdated(name: string) {
    setStreamName(name);
  }

  function handleGateUpdated(config: {
    requiresMetoken: boolean;
    metokenPrice: number | null;
  }) {
    setRequiresMetoken(config.requiresMetoken);
    setMetokenPrice(config.metokenPrice);
  }

  async function handleToggleClipping(next: boolean) {
    if (!user?.address) return;
    const previous = allowClipping;
    setAllowClipping(next);
    setIsUpdatingClipPref(true);
    try {
      await updateStream(user.address, { allow_clipping: next });
    } catch (err) {
      logger.error("Failed to update clipping preference:", err);
      setAllowClipping(previous);
    } finally {
      setIsUpdatingClipPref(false);
    }
  }

  async function handleCreateStream() {
    if (!user?.address) return;
    setIsCreatingStream(true);
    setStreamCreateError(null);
    try {
      const authHeaders = await getAuthHeaders();
      const result = await createStreamViaProxy({
        creatorAddress: user.address,
        authHeaders,
        name: `Broadcast-${Date.now()}`,
        profiles: [
          {
            name: "480p",
            width: 854,
            height: 480,
            bitrate: 1_000_000,
            fps: 30,
            fpsDen: 1,
            quality: 23,
            gop: "2",
            profile: "H264Baseline",
          },
          {
            name: "720p",
            width: 1280,
            height: 720,
            bitrate: 2_500_000,
            fps: 30,
            fpsDen: 1,
            quality: 23,
            gop: "2",
            profile: "H264Baseline",
          },
          {
            name: "1080p",
            width: 1920,
            height: 1080,
            bitrate: 4_500_000,
            fps: 30,
            fpsDen: 1,
            quality: 23,
            gop: "2",
            profile: "H264Baseline",
          },
        ],
        record: true,
        playbackPolicy: { type: "jwt" },
        // Don't include multistream targets during initial creation
        // Targets can be added after stream creation using the API
        multistream: undefined,
      });

      const streamKeyValue = result.streamKey;
      const streamIdValue = result.streamId;
      const playbackIdValue = result.playbackId;

      if (streamKeyValue) {
        setStreamKey(streamKeyValue);
        if (streamIdValue) {
          setStreamId(streamIdValue);
          if (playbackIdValue) setPlaybackId(playbackIdValue);
        }
      } else {
        setStreamCreateError("Stream key not found in response");
      }
    } catch (e) {
      setStreamCreateError("Failed to create stream");
    } finally {
      setIsCreatingStream(false);
    }
  }

  if (!isConnected) {
    return (
      <ProfilePageGuard>
        <MembershipGuard>
          <div className="min-h-screen p-6">
            <Alert variant="destructive">
              <FaExclamationTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                Please connect your wallet to access the live streaming feature.
              </AlertDescription>
            </Alert>
          </div>
        </MembershipGuard>
      </ProfilePageGuard>
    );
  }

  return (
    <ProfilePageGuard>
      <MembershipGuard>
        <div className="min-h-screen p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  <BreadcrumbLink>
                    <BreadcrumbPage>Live</BreadcrumbPage>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400">
              <VideoIcon className="h-5 w-5" />
              <span>Live Studio</span>
            </h1>
          </div>
          <div>
            {!streamKey ? (
              <div className="flex flex-col items-center justify-center my-8">
                {thumbnailLoading ? (
                  <div className="flex items-center justify-center h-32 text-gray-400 mb-6">
                    Loading thumbnail...
                  </div>
                ) : thumbnailError ? (
                  <div className="flex items-center justify-center h-32 text-red-400 mb-6">
                    {thumbnailError}
                  </div>
                ) : thumbnailUrl ? (
                  <div className="mb-6 w-full max-w-md">
                    <LivestreamThumbnail thumbnailUrl={thumbnailUrl} />
                  </div>
                ) : null}
                <button
                  onClick={handleCreateStream}
                  disabled={isCreatingStream}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isCreatingStream ? "Creating Stream..." : "Create Stream"}
                </button>
                {streamCreateError && (
                  <div className="text-red-500 mt-2">{streamCreateError}</div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                <div className="lg:col-span-2 relative">
                  <Broadcast streamKey={streamKey} streamId={streamId} creatorAddress={user.address} />
                  {user?.address && (
                    <DigitalTwinOverlay creatorAddress={user.address} />
                  )}
                  {playbackId && (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShareDialogOpen(true)}
                      >
                        <Share2 className="h-4 w-4 mr-1.5" /> Share Stream
                      </Button>
                      {isStreamLive && liveStream?.playback_id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-500/40 text-red-400 hover:text-red-300"
                          onClick={() => setSongchainShareOpen(true)}
                        >
                          <Radio className="h-4 w-4 mr-1.5" /> Share to Songchain
                        </Button>
                      )}
                      {chatStreamId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setModeratorsDialogOpen(true)}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1.5" /> Manage Moderators
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="lg:col-span-1">
                  {chatStreamId && chatSessionId ? (
                    <LiveChat
                      streamId={chatStreamId}
                      sessionId={chatSessionId}
                      creatorAddress={user.address}
                      className="h-[min(70vh,520px)]"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 text-sm text-muted-foreground">
                      Chat will appear here once the stream is ready.
                    </div>
                  )}
                </div>
              </div>
            )}

            {streamKey && streamId && user?.address && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                <StreamThumbnailUploader
                  creatorAddress={user.address}
                  playbackId={playbackId || streamId}
                  currentThumbnailUrl={thumbnailUrl}
                  onThumbnailUpdated={handleThumbnailUpdated}
                />
                <StreamNameEditor
                  creatorAddress={user.address}
                  currentName={streamName}
                  onNameUpdated={handleNameUpdated}
                />
                <StreamMeTokenGateEditor
                  creatorAddress={user.address}
                  requiresMetoken={requiresMetoken}
                  metokenPrice={metokenPrice}
                  onGateUpdated={handleGateUpdated}
                />
              </div>
            )}
            {streamId && user?.address && (
              <StreamIPRegistration
                creatorAddress={user.address}
                streamName={streamName}
                thumbnailUrl={thumbnailUrl}
                storyIpId={storyIpId}
                licenseTermsId={storyLicenseTermsId}
                commercialRevShare={storyRevShare}
                onRegistered={({ ipId, licenseTermsId, commercialRevShare }) => {
                  setStoryIpId(ipId);
                  setStoryLicenseTermsId(licenseTermsId);
                  setStoryRevShare(commercialRevShare);
                }}
              />
            )}
            {streamId && (
              <div className="mt-4 border-t border-white/20 pt-3 max-w-[576px] mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Allow viewer clipping</p>
                    <p className="text-xs text-gray-400">
                      Let viewers create short clips from your stream and mint them as NFTs.
                    </p>
                  </div>
                  <Switch
                    checked={allowClipping}
                    onCheckedChange={handleToggleClipping}
                    disabled={isUpdatingClipPref}
                    aria-label="Allow viewer clipping"
                  />
                </div>
              </div>
            )}
            {playbackId && (
              <CreatorClipsList playbackId={playbackId} />
            )}
            <div className="mt-4 border-t border-white/20 pt-3 max-w-[576px] mx-auto">
              <p className="mb-2 text-sm font-semibold">Multistream Targets</p>
              {streamId ? (
                <>
                  <MultistreamTargetsForm
                    streamId={streamId}
                    onTargetAdded={handleTargetAdded}
                    isStreamActive={!!streamKey}
                  />
                  {isLoadingTargets ? (
                    <div className="text-xs mt-2">Loading targets...</div>
                  ) : (
                    <>
                      <MultistreamTargetsList
                        targets={multistreamTargets}
                        onTargetRemoved={handleTargetRemoved}
                      />
                      {multistreamTargets.length === 0 && (
                        <div className="text-xs text-gray-400 mt-2">
                          No multistream targets configured. Your stream will only
                          be available on this platform.
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-400 mt-2">
                  Create a stream first to configure multistream targets.
                </div>
              )}
            </div>
          </div>
        </div>
        {liveStream?.playback_id && (
          <SongchainShareLiveDialog
            open={songchainShareOpen}
            onOpenChange={setSongchainShareOpen}
            stream={liveStream}
            feedId={songchainFeedId}
          />
        )}
        {playbackId && (
          <ShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            videoTitle={streamName || "Live Stream"}
            videoId={playbackId}
            shareUrlOverride={`/watch/${playbackId}`}
            titleOverride={streamName || "Live Stream"}
            thumbnailUrlOverride={thumbnailUrl ?? undefined}
            dialogTitle="Share Live Stream"
            shareNoun="live stream"
          />
        )}
        {chatStreamId && user?.address && (
          <ModeratorsDialog
            open={moderatorsDialogOpen}
            onOpenChange={setModeratorsDialogOpen}
            streamId={chatStreamId}
            creatorAddress={user.address}
          />
        )}
      </MembershipGuard>
    </ProfilePageGuard>
  );
}
