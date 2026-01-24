"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Twitter, Globe, ExternalLink, Loader2 } from "lucide-react";
import { fetchVideoAssetByPlaybackId } from "@/lib/utils/video-assets-client";
import { getThumbnailUrl } from "@/lib/utils/thumbnail";
import { convertFailingGateway } from "@/lib/utils/image-gateway";
import { logger } from '@/lib/utils/logger';


interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoTitle: string;
  videoId: string;
  playbackId?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  videoTitle,
  videoId,
  playbackId,
}: ShareDialogProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(true);
  const [shareUrl, setShareUrl] = useState<string>("");

  // Remove .mp4 extension from title if present
  const cleanTitle = videoTitle.endsWith('.mp4') ? videoTitle.slice(0, -4) : videoTitle;

  useEffect(() => {
    if (!open) return;

    // Get the full URL for sharing
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const videoUrl = `${baseUrl}/discover/${videoId}`;
    setShareUrl(videoUrl);

    // Fetch thumbnail URL
    async function fetchThumbnail() {
      setIsLoadingThumbnail(true);
      try {
        let thumbnail: string | null = null;

        // First, try to get thumbnail from database
        if (playbackId) {
          const dbAsset = await fetchVideoAssetByPlaybackId(playbackId);
          if (dbAsset && (dbAsset as any).thumbnail_url && (dbAsset as any).thumbnail_url.trim() !== "") {
            thumbnail = convertFailingGateway((dbAsset as any).thumbnail_url);
          }

          // If no database thumbnail, try Livepeer VTT thumbnails
          if (!thumbnail) {
            const url = await getThumbnailUrl(playbackId);
            thumbnail = url ? convertFailingGateway(url) : null;
          }
        }

        // Fallback to default thumbnail if no thumbnail found or empty string
        if (!thumbnail || thumbnail.trim() === "") {
          thumbnail = "/Creative_TV.png";
        }

        setThumbnailUrl(thumbnail);
      } catch (error) {
        logger.error("Error fetching thumbnail for share:", error);
        setThumbnailUrl("/Creative_TV.png");
      } finally {
        setIsLoadingThumbnail(false);
      }
    }

    fetchThumbnail();
  }, [open, videoId, playbackId]);

  const handleShare = async (platform: "x" | "lens" | "farcaster" | "bluesky") => {
    const fullThumbnailUrl = thumbnailUrl
      ? thumbnailUrl.startsWith("http")
        ? thumbnailUrl
        : `${typeof window !== "undefined" ? window.location.origin : ""}${thumbnailUrl}`
      : `${typeof window !== "undefined" ? window.location.origin : ""}/Creative_TV.png`;

    const text = `Check out this video: ${cleanTitle}`;

    switch (platform) {
      case "x": {
        // X (Twitter) - Use intent URL with image
        const tweetText = encodeURIComponent(`${text}\n\n${shareUrl}`);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, "_blank", "width=550,height=420");
        break;
      }

      case "lens": {
        // Lens Protocol - Uses lens.xyz/share
        const lensUrl = `https://lens.xyz/share?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(lensUrl, "_blank", "width=550,height=600");
        break;
      }

      case "farcaster": {
        // Farcaster - Use warpcast compose
        const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(`${text} ${shareUrl}`)}`;
        window.open(farcasterUrl, "_blank", "width=550,height=600");
        break;
      }

      case "bluesky": {
        // Bluesky - Use intent URL
        const bskyText = encodeURIComponent(`${text}\n\n${shareUrl}`);
        const bskyUrl = `https://bsky.app/intent/compose?text=${bskyText}`;
        window.open(bskyUrl, "_blank", "width=550,height=600");
        break;
      }
    }

    onOpenChange(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to copy link:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Video</DialogTitle>
          <DialogDescription>
            Share "{cleanTitle}" on your favorite platform
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Thumbnail Preview */}
          {isLoadingThumbnail ? (
            <div className="w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            thumbnailUrl && (
              <div className="w-full aspect-video rounded-lg overflow-hidden border">
                <img
                  src={thumbnailUrl}
                  alt={cleanTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            )
          )}

          {/* Social Platform Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleShare("x")}
              variant="outline"
              className="flex items-center justify-center gap-2 h-auto py-3"
            >
              <Twitter className="h-5 w-5" />
              <span>X (Twitter)</span>
            </Button>

            <Button
              onClick={() => handleShare("lens")}
              variant="outline"
              className="flex items-center justify-center gap-2 h-auto py-3"
            >
              <Globe className="h-5 w-5" />
              <span>Lens</span>
            </Button>

            <Button
              onClick={() => handleShare("farcaster")}
              variant="outline"
              className="flex items-center justify-center gap-2 h-auto py-3"
            >
              <Share2 className="h-5 w-5" />
              <span>Farcaster</span>
            </Button>

            <Button
              onClick={() => handleShare("bluesky")}
              variant="outline"
              className="flex items-center justify-center gap-2 h-auto py-3"
            >
              <img src="/icons/Bluesky_butterfly-logo.svg" alt="Bluesky" className="h-5 w-5" />
              <span>Bluesky</span>
            </Button>
          </div>

          {/* Copy Link Button */}
          <Button
            onClick={handleCopyLink}
            variant="default"
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
