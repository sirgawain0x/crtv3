"use client";

import { useRef } from "react";
import { Users } from "lucide-react";
import { SongchainClubGate } from "@/components/songchain/SongchainClubGate";
import { SongchainComposePost } from "@/components/songchain/SongchainComposePost";
import {
  SongchainFeedSection,
  type SongchainFeedHandle,
} from "@/components/songchain/SongchainFeedSection";
import { useSongchainGroupMembership } from "@/hooks/useSongchainGroupMembership";

type SongchainGatedFeedTabProps = {
  gateGroupId: string | null;
  feedId: string | null;
  graphId: string | null;
  feedTitle: string;
  feedDescription: string;
  clubGateTitle?: string;
  clubGateDescription?: string;
  orbClubUrl?: string;
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
}: SongchainGatedFeedTabProps) {
  const feedRef = useRef<SongchainFeedHandle>(null);
  const membership = useSongchainGroupMembership({ groupId: gateGroupId });
  const feedAccessible = membership.isMember;

  return (
    <div className="space-y-6">
      {membership.isMember && !membership.loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          <span>Club member — you can read and post to the Song Cup feed.</span>
        </div>
      )}

      <SongchainClubGate
        membership={membership}
        title={clubGateTitle}
        description={clubGateDescription}
        orbClubUrl={orbClubUrl}
      />

      {feedAccessible ? (
        <>
          <SongchainComposePost
            feedId={feedId}
            onPosted={(created) => feedRef.current?.registerNewPost(created)}
          />
          <SongchainFeedSection
            ref={feedRef}
            title={feedTitle}
            description={feedDescription}
            feedId={feedId}
            graphId={graphId}
            enabled={feedAccessible}
            onPostUpdated={() => feedRef.current?.reload()}
            emptyDescription="Lens custom feeds only show posts published to that feed contract. Existing Orb profile or global posts are not backfilled, so publish a new post directly to this feed if it should appear here."
          />
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Posts appear here after you join the club.
        </p>
      )}
    </div>
  );
}
