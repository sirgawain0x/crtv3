"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import VideoThumbnail from "@/components/Videos/VideoThumbnail";
import * as helpers from "@/lib/helpers";
import type { VideoAsset } from "@/lib/types/video-asset";
import { Calendar, Clock } from "lucide-react";

interface UploadHistoryCardProps {
  asset: VideoAsset;
  index: number;
}

export function UploadHistoryCard({ asset, index }: UploadHistoryCardProps) {
  const createdDate = helpers.parseTimestampToDate(
    new Date(asset.created_at).getTime()
  );
  const updatedDate = helpers.parseTimestampToDate(
    new Date(asset.updated_at).getTime()
  );

  return (
    <Link href={`/discover/${asset.asset_id}`}>
      <Card className="group h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {asset.playback_id ? (
            <VideoThumbnail
              playbackId={asset.playback_id}
              src={null}
              title={asset.title}
              assetId={asset.asset_id}
              className="h-full w-full"
              priority={index < 4} // Priority for first 4 cards
              hidePlayOverlay={true} // Hide play overlay in upload history
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
          <h3 className="line-clamp-2 font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
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
      </Card>
    </Link>
  );
}

