"use client";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { Player } from "@/components/Player/Player";
import { Asset } from "livepeer/models/components";
import Link from "next/link";
import { Src } from "@livepeer/react";
import makeBlockie from "ethereum-blockies-base64";
import VideoViewMetrics from "./VideoViewMetrics";
import { useVideo } from "@/context/VideoContext";
import { fetchAllViews } from "@/app/api/livepeer/views";
import { useEffect, useRef, useState } from "react";
import { fetchVideoAssetByPlaybackId } from "@/lib/utils/video-assets-client";
import VideoThumbnail from './VideoThumbnail';

interface VideoCardProps {
  asset: Asset;
  playbackSources: Src[] | null;
}

const VideoCard: React.FC<VideoCardProps> = ({ asset, playbackSources }) => {
  const { currentPlayingId, setCurrentPlayingId } = useVideo();
  const [dbStatus, setDbStatus] = useState<"draft" | "published" | "minted" | "archived" | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);


  const handlePlay = () => {
    try {
      setCurrentPlayingId(asset?.id || null);
    } catch (error) {
      console.error("Error setting current playing ID:", error);
    }
  };

  useEffect(() => {
    async function fetchStatus() {
      try {
        if (!asset?.playbackId) return;
        const row = await fetchVideoAssetByPlaybackId(asset.playbackId);
        if (row?.status) {
          const validStatuses = ["draft", "published", "minted", "archived"] as const;
          if (validStatuses.includes(row.status as any)) {
            setDbStatus(row.status as "draft" | "published" | "minted" | "archived");
          }
        }
      } catch (e) {
        // no-op
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
        const metrics = await fetchAllViews(asset.playbackId);
        if (metrics && (metrics.viewCount > 0 || metrics.legacyViewCount > 0)) {
          // Call API to update database
          await fetch(`/api/video-assets/sync-views/${asset.playbackId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              viewCount: metrics.viewCount + metrics.legacyViewCount 
            })
          });
          
          // Update last sync time in localStorage
          localStorage.setItem(lastSyncKey, now.toString());
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

  const address = asset.creatorId?.value as string;
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
      <Card key={asset?.id} className={cn("w-full max-w-[360px] mx-auto overflow-hidden")}>
        <div className="mx-auto flex-1 flex-wrap">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Avatar>
                <AvatarImage
                  src={makeBlockie(address)}
                  className="h-10 w-10 rounded-full"
                />
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {shortenAddress(address)}
                </span>
                <span className="text-xs text-gray-500">
                  {shortenAddress(address)}
                </span>
              </div>
            </div>
          </CardHeader>
        </div>
        <VideoThumbnail
          playbackId={asset.playbackId!}
          src={playbackSources}
          assetId={asset?.id}
          title={asset?.name}
          onPlay={handlePlay}
        />
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
          <div className="mt-6 grid grid-flow-row auto-rows-max space-y-3 overflow-hidden">
            <CardTitle>
              <Link href={`/discover/${asset.id}`}>
                <h1
                  className="max-w-full overflow-hidden text-ellipsis 
                whitespace-nowrap text-xl font-bold hover:text-orange-500 focus:text-orange-500"
                >
                  {asset?.name}
                </h1>
              </Link>
            </CardTitle>
            <CardDescription className="text-xl" color={"brand.300"}>
              <span className="text-xs">
                {asset?.createdAt
                  ? new Date(asset.createdAt).toLocaleDateString()
                  : ""}
              </span>
            </CardDescription>
          </div>
        </CardContent>
        <hr className="mb-5" />
        <CardFooter className="mx-auto flex items-center justify-center">
          {asset?.status?.phase === "ready" ? (
            <div className="flex space-x-10">
              <Button
                className="flex-1 cursor-pointer hover:scale-125"
                aria-label={`Buy ${asset?.name}`}
                variant="ghost"
              >
                Buy
              </Button>
              <Link
                href={`/discover/${encodeURIComponent(asset?.id)}`}
              >
                <Button
                  className="flex-1 cursor-pointer hover:scale-125"
                  aria-label={`Comment on ${asset?.name}`}
                  variant="ghost"
                >
                  Comment
                </Button>
              </Link>
              <Button
                className="flex-1 cursor-pointer hover:scale-125"
                aria-label={`Share ${asset?.name}`}
                variant="ghost"
              >
                Share
              </Button>
            </div>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
};

export default VideoCard;
