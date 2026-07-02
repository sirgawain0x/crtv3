"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle,
  ExternalLink,
  Film,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSongCupSubmissions } from "@/lib/hooks/song-cup/useSongCupSubmissions";
import { resolveOrbMediaUrl } from "@/lib/sdk/orb/media";
import { truncateWalletAddress } from "@/lib/songchain/song-cup/admin-config";
import {
  songCupAccentYellow,
  songCupAdminSection,
  songCupBody,
  songCupMuted,
  songCupPostCard,
} from "@/lib/songchain/song-cup/panel-styles";
import { cn } from "@/lib/utils/utils";

type SongCupAdminSubmissionsListProps = {
  className?: string;
  compact?: boolean;
};

function SubmissionVideo({ url }: { url: string }) {
  const playback =
    resolveOrbMediaUrl(url, { type: "video" }) ??
    (url.startsWith("ipfs://")
      ? url.replace("ipfs://", "https://gateway.lighthouse.storage/ipfs/")
      : url);

  return (
    <video
      src={playback}
      controls
      playsInline
      preload="metadata"
      className="aspect-video w-full rounded-lg bg-black object-contain"
    />
  );
}

export function SongCupAdminSubmissionsList({
  className,
  compact = false,
}: SongCupAdminSubmissionsListProps) {
  const { submissions, isLoading, error, refetch, updateStatus, isAdmin } =
    useSongCupSubmissions(true);

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === "pending").length,
    [submissions],
  );

  if (!isAdmin) return null;

  return (
    <section className={cn(songCupAdminSection, className)}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={cn("text-lg font-bold uppercase tracking-wide", songCupAccentYellow)}>
            Submissions review
          </h3>
          <p className={cn("text-xs", songCupMuted)}>
            {pendingCount} pending · {submissions.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
          {!compact && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/songchain/song-cup/submissions">Full page</Link>
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg bg-white/10" />
          ))}
        </div>
      )}

      {!isLoading && submissions.length === 0 && (
        <p className={cn("py-8 text-center text-sm", songCupMuted)}>No submissions yet.</p>
      )}

      {!isLoading && submissions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {submissions.map((submission) => (
            <article
              key={submission.id}
              className={cn("flex flex-col overflow-hidden rounded-xl", songCupPostCard)}
            >
              {submission.grove_url ? (
                <SubmissionVideo url={submission.grove_url} />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted/50 dark:bg-white/5">
                  <Film className={cn("h-8 w-8", songCupMuted)} />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-3">
                <h4 className={cn("line-clamp-1 text-sm font-semibold", songCupBody)}>
                  {submission.title || "Untitled submission"}
                </h4>
                <p className={cn("text-[11px]", songCupMuted)}>
                  {truncateWalletAddress(submission.wallet_address)} ·{" "}
                  {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                </p>
                {submission.description && (
                  <p className={cn("line-clamp-2 text-xs", songCupMuted)}>{submission.description}</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                  <Badge
                    variant={
                      submission.status === "approved"
                        ? "default"
                        : submission.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {submission.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[10px]"
                    asChild
                  >
                    <Link href={submission.grove_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                      Grove
                    </Link>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 gap-1 text-[11px] border-emerald-500/40 text-emerald-300"
                    onClick={() => void updateStatus(submission.id, "approved")}
                    disabled={submission.status === "approved"}
                  >
                    <CheckCircle className="h-3 w-3" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 gap-1 text-[11px] border-red-500/40 text-red-300"
                    onClick={() => void updateStatus(submission.id, "rejected")}
                    disabled={submission.status === "rejected"}
                  >
                    <XCircle className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
