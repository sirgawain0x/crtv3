"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnyClient } from "@lens-protocol/client";
import {
  fetchGroup,
  fetchGroupMembers,
  joinGroup,
} from "@lens-protocol/client/actions";
import { evmAddress } from "@lens-protocol/types";
import { publicClient } from "@/lib/sdk/lens/client";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { toast } from "sonner";

type SongchainGroupPanelProps = {
  groupId: string | null;
};

export function SongchainGroupPanel({ groupId }: SongchainGroupPanelProps) {
  const { canWrite, getSessionClient, promptWriteAccess } = useLensOrbWrite();
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      let client: AnyClient = publicClient;
      if (canWrite) {
        client = await getSessionClient();
      }

      const groupResult = await fetchGroup(client, {
        group: evmAddress(groupId),
      });
      if (groupResult.isErr()) throw new Error(groupResult.error.message);
      const group = groupResult.value;
      if (!group) {
        setName(null);
        return;
      }

      setName(group.metadata?.name ?? 'Songchain Group');
      setDescription(
        group.metadata && 'description' in group.metadata
          ? String(group.metadata.description ?? '')
          : null,
      );

      const ops = group.operations;
      if (ops && 'isMember' in ops) {
        setIsMember(Boolean(ops.isMember));
      }

      const membersResult = await fetchGroupMembers(client, {
        group: evmAddress(groupId),
        pageSize: 'TEN',
      });
      if (membersResult.isOk()) {
        setMemberCount(membersResult.value.items.length);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [groupId, canWrite, getSessionClient]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  const handleJoin = async () => {
    if (!groupId) return;
    if (!canWrite) {
      promptWriteAccess();
      toast.info('Link your Orb account to join the Songchain group');
      return;
    }

    setJoining(true);
    try {
      const client = await getSessionClient();
      const result = await joinGroup(client, { group: evmAddress(groupId) });
      if (result.isErr()) throw new Error(result.error.message);
      toast.success('Joined Songchain group');
      setIsMember(true);
      void loadGroup();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join group');
    } finally {
      setJoining(false);
    }
  };

  if (!groupId) {
    return (
      <section className="rounded-lg border border-dashed border-border/60 p-8 text-center text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Group address not configured yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border/60 bg-card p-6">
      {loading && !name ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-violet-400" />
                {name ?? 'Community'}
              </h2>
              {description && (
                <p className="mt-2 text-sm text-muted-foreground max-w-xl">{description}</p>
              )}
              {memberCount != null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing {memberCount}+ members
                </p>
              )}
            </div>
            {!isMember ? (
              <Button disabled={joining} onClick={() => void handleJoin()}>
                {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Join group
              </Button>
            ) : (
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-medium text-violet-300">
                Member
              </span>
            )}
          </div>
          {!canWrite && (
            <p className="mt-4 text-sm text-muted-foreground">
              Read-only: connect wallet, sign in with Orb, and link your profile to join or post.
            </p>
          )}
        </>
      )}
    </section>
  );
}
