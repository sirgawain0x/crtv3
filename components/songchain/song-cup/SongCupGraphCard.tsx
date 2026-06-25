"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Users, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSongCupGroupMembers } from "@/hooks/useSongCupGroupMembers";
import { SongCupGraph3DModal } from "./SongCupGraph3DModal";
import { cn } from "@/lib/utils";

function memberLabel(member: { address: string; username?: string | null }): string {
  if (member.username) return `@${member.username}`;
  return `${member.address.slice(0, 6)}…${member.address.slice(-4)}`;
}

function memberInitials(member: { address: string; username?: string | null }): string {
  if (member.username) return member.username.slice(0, 2).toUpperCase();
  return member.address.slice(0, 2).toUpperCase();
}

type SongCupGraphCardProps = {
  groupId: string | null;
};

export function SongCupGraphCard({ groupId }: SongCupGraphCardProps) {
  const { members, loading, error } = useSongCupGroupMembers(groupId);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden rounded-xl border border-fuchsia-500/40 bg-black p-5 shadow-[0_0_24px_rgba(253,0,215,0.12)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-fuchsia-400" />
            <h2 className="text-lg font-bold uppercase tracking-wide text-white">The Graph</h2>
          </div>
          {members.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
            >
              View graph
            </Button>
          )}
        </div>

        {loading && members.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members found yet. Join the club to populate the graph.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3 overflow-hidden py-1">
                {members.slice(0, 10).map((member, i) => (
                  <Avatar
                    key={member.address}
                    className={cn(
                      "h-9 w-9 border-2 border-black ring-1 ring-fuchsia-500/60",
                      i === 0 && "z-10",
                    )}
                    title={memberLabel(member)}
                  >
                    <AvatarFallback className="bg-gradient-to-br from-fuchsia-600 to-violet-700 text-[10px] font-bold text-white">
                      {memberInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 10 && (
                  <span className="z-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-muted text-[10px] font-semibold text-white">
                    +{members.length - 10}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-sm font-medium text-fuchsia-300 underline-offset-4 hover:text-fuchsia-200 hover:underline"
              >
                {members.length} members
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {members.slice(0, 6).map((member) => (
                <Link
                  key={member.address}
                  href={`/profile/${member.address}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1 text-xs text-fuchsia-100 hover:bg-fuchsia-500/20"
                >
                  <Users className="h-3 w-3" />
                  {memberLabel(member)}
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <SongCupGraph3DModal open={modalOpen} onOpenChange={setModalOpen} members={members} />
    </>
  );
}
