"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { ShareDialog } from "./ShareDialog";

interface VideoShareButtonProps {
  videoId: string;
  videoTitle: string;
  playbackId?: string;
}

export function VideoShareButton({
  videoId,
  videoTitle,
  playbackId,
}: VideoShareButtonProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsShareDialogOpen(true)}
        aria-label={`Share ${videoTitle}`}
        className="hover:scale-110 transition-transform"
      >
        <Share2 className="h-5 w-5" />
      </Button>

      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        videoTitle={videoTitle}
        videoId={videoId}
        playbackId={playbackId}
      />
    </>
  );
}
