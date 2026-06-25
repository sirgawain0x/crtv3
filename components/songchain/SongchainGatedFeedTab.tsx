"use client";

import { useSongchainGroupMembership } from "@/hooks/useSongchainGroupMembership";
import { SongchainClubGate } from "./SongchainClubGate";
import { SongchainComposePost } from "./SongchainComposePost";
import { SongchainFeedSection } from "./SongchainFeedSection";
import { Loader2, Lock, ExternalLink } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SongchainGatedFeedTabProps = {
  gateGroupId: string | null;
  feedId: string | null;
  graphId: string | null;
  feedTitle: string;
  feedDescription: string;
  clubGateTitle?: string;
  clubGateDescription?: string;
  orbClubUrl?: string;
  /** If true, non-members can read the feed but cannot post/interact. */
  allowReadBeforeJoin?: boolean;
  /** Enables a contained, scroll-driven animated feed. */
  animated?: boolean;
};

export function SongchainGatedFeedTab({
  gateGroupId,
  feedId,
  graphId,
  feedTitle,
  feedDescription,
  clubGateTitle,
  clubGateDescription,
  orbClubUrl,
  allowReadBeforeJoin = false,
  animated = false,
}: SongchainGatedFeedTabProps) {
  const membership = useSongchainGroupMembership({ groupId: gateGroupId });

  if (membership.loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking club membership...
      </div>
    );
  }

  const isMember = membership.isMember ?? false;

  return (
    <div className={cn("space-y-6", allowReadBeforeJoin && "space-y-4")}>
      {isMember ? (
        <SongchainComposePost feedId={feedId} />
      ) : allowReadBeforeJoin ? (
        <div className="flex flex-col gap-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {membership.imageUrl ? (
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-fuchsia-500/30">
                <Image src={membership.imageUrl} alt={membership.name ?? "Club"} width={40} height={40} className="h-full w-full object-cover" unoptimized />
              </div>
            ) : (
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-400" />
            )}
            <div>
              <p className="font-medium text-foreground">{clubGateTitle ?? "Join the club to post"}</p>
              <p className="text-sm text-muted-foreground">
                {clubGateDescription ??
                  "You can read the feed now. Join the club on Lens to post, comment, and react."}
              </p>
            </div>
          </div>
          {orbClubUrl ? (
            <Button asChild variant="secondary" className="shrink-0">
              <a href={orbClubUrl} target="_blank" rel="noopener noreferrer">
                Join club <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      ) : (
        <SongchainClubGate
          membership={membership}
          title={clubGateTitle}
          description={clubGateDescription}
          orbClubUrl={orbClubUrl}
        />
      )}

      {(isMember || allowReadBeforeJoin) && (
        <SongchainFeedSection
          title={feedTitle}
          description={feedDescription}
          feedId={feedId}
          graphId={graphId}
          emptyDescription="Lens custom feeds only show posts published to that feed contract. Existing Orb profile or global posts are not backfilled."
          readOnly={allowReadBeforeJoin && !isMember}
          animated={animated}
        />
      )}
    </div>
  );
}
