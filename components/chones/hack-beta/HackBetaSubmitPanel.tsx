"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CreativeTVVideoPicker } from "@/components/songchain/CreativeTVVideoPicker";
import { HackBetaShareToXButton } from "@/components/chones/hack-beta/HackBetaShareToXButton";
import { useCreatorVideoLibrary } from "@/hooks/useCreatorVideoLibrary";
import { useHackBetaUserSubmission } from "@/lib/hooks/hack-beta/useHackBetaUserSubmission";
import { useUser } from "@/lib/wallet/react";
import { groveService } from "@/lib/sdk/grove/service";
import { hackBetaSubmissionsService } from "@/lib/sdk/supabase/hack-beta-submissions";
import type { VideoAsset } from "@/lib/types/video-asset";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type HackBetaSubmitPanelProps = {
  className?: string;
};

export function HackBetaSubmitPanel({ className }: HackBetaSubmitPanelProps) {
  const user = useUser();
  const { videos, loading: libraryLoading, hasWallet } = useCreatorVideoLibrary();
  const {
    submission: existing,
    hasSubmitted,
    isLoading: loadingSubmission,
    setSubmission,
  } = useHackBetaUserSubmission(user?.address);

  const [selected, setSelected] = useState<VideoAsset | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preferredVideos = useMemo(() => {
    const tagged = videos.filter(
      (v) => (v.category || "").toLowerCase() === "hackathon",
    );
    return tagged.length > 0 ? tagged : videos;
  }, [videos]);

  const handleSubmit = async () => {
    if (!user?.address) {
      toast.error("Connect your wallet to submit.");
      return;
    }
    if (!selected) {
      toast.error("Select a video from your library.");
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = {
        type: "hack-beta-submission",
        event: "HACKATHON BETA",
        wallet: user.address.toLowerCase(),
        video_asset_id: selected.asset_id,
        title: selected.title,
        category: selected.category,
        playback_id: selected.playback_id,
        submitted_at: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      const grove = await groveService.uploadJson(receipt);
      if (!grove.success || !grove.url) {
        throw new Error(grove.error || "Grove receipt upload failed");
      }

      const result = await hackBetaSubmissionsService.create({
        wallet_address: user.address,
        video_asset_id: selected.asset_id,
        title: selected.title,
        description: notes.trim() || selected.description || undefined,
        playback_id: selected.playback_id,
        thumbnail_url: selected.thumbnailUri || undefined,
        grove_url: grove.url,
        grove_hash: grove.hash,
      });

      if (!result.ok) {
        toast.error(result.message || "Submission failed");
        return;
      }

      setSubmission(result.submission);
      toast.success("Submitted to HACKATHON BETA!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingSubmission) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your submission…
      </div>
    );
  }

  if (hasSubmitted && existing) {
    return (
      <div
        className={cn(
          "space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5",
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <h3 className="font-semibold text-foreground">You&apos;re submitted</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {existing.title || "Your demo"} · status: {existing.status}
              {existing.is_favorite ? " · favorite" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {existing.video_asset_id && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/discover/${existing.video_asset_id}`}>View video</Link>
            </Button>
          )}
          <HackBetaShareToXButton title={existing.title} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border/60 bg-card/40 p-5",
        className,
      )}
    >
      <div>
        <h3 className="text-lg font-semibold text-foreground">Submit your demo</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload on Creative TV with genre <strong>Hackathon</strong>, then pick it from your
          library. We&apos;ll pin a Grove receipt for your submission.
        </p>
      </div>

      {!hasWallet && (
        <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-300">
          <AlertCircle className="h-4 w-4" />
          Connect your wallet to load your library.
        </p>
      )}

      <CreativeTVVideoPicker
        videos={preferredVideos}
        loading={libraryLoading}
        selected={selected}
        onSelect={setSelected}
        disabled={!hasWallet}
      />

      {preferredVideos.length > 0 &&
        !preferredVideos.some((v) => (v.category || "").toLowerCase() === "hackathon") && (
          <p className="text-xs text-muted-foreground">
            Tip: set category to <strong>Hackathon</strong> when uploading so demos are easy to
            find.
          </p>
        )}

      <div className="space-y-2">
        <label htmlFor="hack-beta-notes" className="text-sm font-medium">
          Notes for judges (optional)
        </label>
        <Textarea
          id="hack-beta-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you build? Links, team, etc."
          rows={3}
        />
      </div>

      <Button
        onClick={() => void handleSubmit()}
        disabled={!hasWallet || !selected || isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit to HACKATHON BETA"
        )}
      </Button>
    </div>
  );
}
