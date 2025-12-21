"use client";
import { Button } from "../ui/button";
import { convertFailingGateway } from '@/lib/utils/image-gateway';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { Player } from "@/components/Player/Player";
import { Asset } from "livepeer/models/components";
import Link from "next/link";
import { Src } from "@livepeer/react";
import makeBlockie from "ethereum-blockies-base64";
import VideoViewMetrics from "./VideoViewMetrics";
import { useVideo } from "@/context/VideoContext";
import { MessageCircle, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
import { fetchVideoAssetByPlaybackId } from "@/lib/utils/video-assets-client";
import VideoThumbnail from './VideoThumbnail';
import { ShareDialog } from "./ShareDialog";
import { useCreatorProfile } from "@/lib/hooks/metokens/useCreatorProfile";
import { VideoBuyButton } from "./VideoBuyButton";

interface VideoCardProps {
  asset: Asset;
  playbackSources: Src[] | null;
  priority?: boolean; // If true, uses loading="eager" for above-the-fold images (LCP optimization)
}

const VideoCard: React.FC<VideoCardProps> = ({ asset, playbackSources, priority = false }) => {
  const { currentPlayingId, setCurrentPlayingId } = useVideo();
  const [dbStatus, setDbStatus] = useState<"draft" | "published" | "minted" | "archived" | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const address = asset.creatorId?.value as string;
  const { profile: creatorProfile } = useCreatorProfile(address);


  const handlePlay = () => {
    try {
      setCurrentPlayingId(asset?.id || null);
    } catch (error) {
      console.error("Error setting current playing ID:", error);
    }
  };

  const [videoAssetId, setVideoAssetId] = useState<number | null>(null);
  const [hasMeToken, setHasMeToken] = useState<boolean>(false);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      // Reset state when playbackId changes or is missing
      if (!asset?.playbackId) {
        setVideoAssetId(null);
        setHasMeToken(false);
        setVideoTitle(null);
        return;
      }

      // Reset state at the start of each fetch to prevent stale data
      setVideoAssetId(null);
      setHasMeToken(false);
      setVideoTitle(null);

      try {
        const row = await fetchVideoAssetByPlaybackId(asset.playbackId);
        if (row) {
          if (row.id) {
            setVideoAssetId(row.id);
          }
          if (row?.title) {
            setVideoTitle(row.title);
          }
          if (row?.status) {
            const validStatuses = ["draft", "published", "minted", "archived"] as const;
            if (validStatuses.includes(row.status as any)) {
              setDbStatus(row.status as "draft" | "published" | "minted" | "archived");
            }
          }
          // Check if video has an associated MeToken
          if (row?.creator_metoken_id || row?.attributes?.content_coin_id) {
            setHasMeToken(true);
          } else {
            setHasMeToken(false);
          }
        } else {
          // No video asset found - reset state
          setVideoAssetId(null);
          setHasMeToken(false);
          setVideoTitle(null);
        }
      } catch (e) {
        // Reset state on error to prevent stale data from previous video
        console.error('Error fetching video asset:', e);
        setVideoAssetId(null);
        setHasMeToken(false);
        setVideoTitle(null);
      }
    }
    fetchStatus();
  }, [asset?.playbackId]);

  // Smart rate-limited view count syncing from Livepeer to database
  useEffect(() => {
    async function syncViewCount() {
      if (!asset?.playbackId || dbStatus !== 'published') return;

      // Check last sync time from localStorage to avoid excessive API calls
      const lastSyncKey = `view-sync-${asset.playbackId}`;
      const lastSyncStr = localStorage.getItem(lastSyncKey);
      const now = Date.now();

      // Only sync if more than 1 hour has passed since last sync for this video
      if (lastSyncStr) {
        const lastSync = parseInt(lastSyncStr);
        const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
        if (hoursSinceSync < 1) {
          return; // Skip sync, too soon
        }
      }

      try {
        // Call server endpoint that fetches from Livepeer and updates database
        const response = await fetch(`/api/video-assets/sync-views/${asset.playbackId}`, {
          method: 'GET',
        });

        if (response.ok) {
          const result = await response.json();
          // Update last sync time in localStorage only on success
          if (result.success) {
            localStorage.setItem(lastSyncKey, now.toString());
          }
        }
      } catch (error) {
        console.error('Failed to sync view count:', error);
      }
    }

    // Only sync if the video is published
    if (dbStatus === 'published') {
      syncViewCount();
    }
  }, [asset?.playbackId, dbStatus]);

  // Early return if asset is not provided or invalid
  if (!asset) {
    console.warn("VideoCard: No asset provided");
    return null;
  }

  // Early return if asset is not ready
  if (asset.status?.phase !== "ready") {
    console.debug(
      `VideoCard: Asset ${asset.id} not ready, status: ${asset.status?.phase}`
    );
    return null;
  }

  if (!address) {
    console.warn(`VideoCard: No creator address for asset ${asset.id}`, asset);
    return null;
  }

  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };



  return (
    <div className="w-full" ref={playerRef}>
      <Card key={asset?.id} className={cn("w-full overflow-hidden")}>
        <div className="mx-auto flex-1 flex-wrap">
          <CardHeader>
            <Link
              href={`/creator/${address}`}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
              onClick={(e) => {
                // Prevent event bubbling to avoid triggering video card interactions
                e.stopPropagation();
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={creatorProfile?.avatar_url ? convertFailingGateway(creatorProfile.avatar_url) : makeBlockie(address)}
                  alt={creatorProfile?.username || "Creator"}
                  className="h-10 w-10 rounded-full"
                />
                <AvatarFallback>
                  {creatorProfile?.username
                    ? creatorProfile.username.charAt(0).toUpperCase()
                    : address.slice(2, 3).toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {creatorProfile?.username || shortenAddress(address)}
                </span>
              </div>
            </Link>
          </CardHeader>
        </div>
        <Link href={`/discover/${asset.id}`} className="block cursor-pointer">
          <VideoThumbnail
            playbackId={asset.playbackId!}
            src={playbackSources}
            assetId={asset?.id}
            title={asset?.name}
            enablePreview={true}
            priority={priority}
          />
        </Link>
        <CardContent>
          <div className="my-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={asset.status?.phase === "ready" ? "black" : "white"}>
                {asset?.status?.phase}
              </Badge>
              {dbStatus && (
                <Badge variant="secondary">
                  {dbStatus}
                </Badge>
              )}
            </div>
            <VideoViewMetrics playbackId={asset.playbackId || ""} />
          </div>
          {videoAssetId && (
            <div className="my-2">
              {/* Contribution display removed here as it is now in the Buy button */}
            </div>
          )}
          <div className="mt-6 grid grid-flow-row auto-rows-max space-y-3 overflow-hidden">
            <CardDescription className="text-xl" color={"brand.300"}>
              <span className="text-xs">
                {asset?.createdAt
                  ? new Date(asset.createdAt).toLocaleDateString()
                  : ""}
              </span>
            </CardDescription>
            <CardTitle>
              <Link href={`/discover/${asset.id}`}>
                <h1
                  className="max-w-full overflow-hidden text-ellipsis 
                whitespace-nowrap text-xl font-bold hover:text-orange-500 focus:text-orange-500"
                >
                  {videoTitle || asset?.name}
                </h1>
              </Link>
            </CardTitle>
          </div>
        </CardContent>
        <hr className="mb-5" />
        <CardFooter className="mx-auto flex items-center justify-center">
          {asset?.status?.phase === "ready" ? (
            <div className="flex space-x-10">
              {hasMeToken && asset?.playbackId && (
                <VideoBuyButton
                  playbackId={asset.playbackId}
                  videoTitle={videoTitle || asset?.name || "Video"}
                  className="flex-1"
                />
              )}
              <Link
                href={`/discover/${encodeURIComponent(asset?.id)}`}
              >
                <Button
                  className="flex-1 cursor-pointer hover:scale-125"
                  aria-label={`Comment on ${asset?.name}`}
                  variant="ghost"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </Link>
              <Button
                className="flex-1 cursor-pointer hover:scale-125"
                aria-label={`Share ${asset?.name}`}
                variant="ghost"
                onClick={() => setIsShareDialogOpen(true)}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          ) : null}
        </CardFooter>
      </Card>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        videoTitle={asset?.name || "Video"}
        videoId={asset?.id || ""}
        playbackId={asset?.playbackId || undefined}
      />


    </div>
  );
};

export default VideoCard;
