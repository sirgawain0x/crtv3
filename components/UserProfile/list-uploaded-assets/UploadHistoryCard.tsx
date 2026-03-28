"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import VideoThumbnail from "@/components/Videos/VideoThumbnail";
import * as helpers from "@/lib/helpers";
import type { VideoAsset } from "@/lib/types/video-asset";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { VideoSplitDistributeButton } from "@/components/Videos/VideoSplitDistributeButton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { deleteVideoAsset } from "@/services/video-assets";

interface UploadHistoryCardProps {
  asset: VideoAsset;
  index: number;
}

export function UploadHistoryCard({ asset, index }: UploadHistoryCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const createdDate = helpers.parseTimestampToDate(
    new Date(asset.created_at).getTime()
  );
  const updatedDate = helpers.parseTimestampToDate(
    new Date(asset.updated_at).getTime()
  );

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        await deleteVideoAsset(asset.asset_id, asset.creator_id);
        toast({
          title: "Video deleted",
          description: "The video has been successfully deleted.",
        });
        setIsDeleted(true);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete video",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (isDeleted) return null;

  return (
    <Card className="group h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] relative">
      <Link href={`/discover/${asset.asset_id}`} className="block">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {asset.playback_id ? (
            <VideoThumbnail
              playbackId={asset.playback_id}
              src={null}
              title={asset.title}
              assetId={asset.asset_id}
              initialThumbnailUrl={
                (asset as { thumbnail_url?: string }).thumbnail_url ??
                asset.thumbnailUri
              }
              className="h-full w-full"
              priority={index < 4}
              hidePlayOverlay={true}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">No thumbnail</p>
              </div>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-2 font-semibold leading-tight text-foreground group-hover:text-primary transition-colors pr-8">
            {helpers.titleCase(asset.title)}
          </h3>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created: {createdDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Updated: {updatedDate}</span>
            </div>
          </div>
        </CardContent>
      </Link>

      {/* Delete Button */}
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8 shadow-md"
          onClick={handleDelete}
          disabled={isDeleting}
          title="Delete video"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Distribute Revenue Button - Only shows if video has splits */}
      {asset.splits_address && asset.creator_id && (
        <div
          className="absolute bottom-4 right-4 z-10"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <VideoSplitDistributeButton
            videoAssetId={asset.asset_id}
            creatorId={asset.creator_id}
            splitsAddress={asset.splits_address}
          />
        </div>
      )}
    </Card>
  );
}

