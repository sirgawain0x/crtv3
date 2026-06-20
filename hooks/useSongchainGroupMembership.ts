"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnyClient } from "@lens-protocol/client";
import { fetchGroup, joinGroup } from "@lens-protocol/client/actions";
import { evmAddress } from "@lens-protocol/types";
import { createLensClient } from "@/lib/sdk/lens/create-client";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { clearStaleOrbSessionIfNeeded } from "@/lib/sdk/orb/session-errors";
import { toast } from "sonner";

type UseSongchainGroupMembershipOptions = {
  groupId: string | null;
};

const MEMBERSHIP_SYNC_DELAYS_MS = [2000, 4000, 8000];

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function applyMembershipFromApi(
  memberFromApi: boolean,
  optimisticMemberRef: { current: boolean },
  setIsMember: (value: boolean) => void,
) {
  if (memberFromApi) {
    optimisticMemberRef.current = false;
    setIsMember(true);
    return;
  }
  if (optimisticMemberRef.current) {
    setIsMember(true);
    return;
  }
  setIsMember(false);
}

export function useSongchainGroupMembership({
  groupId,
}: UseSongchainGroupMembershipOptions) {
  const { canWrite, getSessionClient, promptWriteAccess } = useLensOrbWrite();
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optimisticMemberRef = useRef(false);
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async () => {
    if (!groupId) {
      optimisticMemberRef.current = false;
      setName(null);
      setDescription(null);
      setIsMember(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let client: AnyClient = createLensClient();
      if (canWrite) {
        try {
          client = await getSessionClient();
        } catch (err) {
          clearStaleOrbSessionIfNeeded(err);
          client = createLensClient();
        }
      }

      const groupResult = await fetchGroup(client, {
        group: evmAddress(groupId),
      });
      if (groupResult.isErr()) throw new Error(groupResult.error.message);

      const group = groupResult.value;
      if (!group) {
        optimisticMemberRef.current = false;
        setName(null);
        setDescription(null);
        applyMembershipFromApi(false, optimisticMemberRef, setIsMember);
        setError("Club not found on this Lens network.");
        return;
      }

      setName(group.metadata?.name ?? "Song Cup club");
      setDescription(
        group.metadata && "description" in group.metadata
          ? String(group.metadata.description ?? "")
          : null,
      );

      const ops = group.operations;
      const memberFromApi =
        ops && "isMember" in ops ? Boolean(ops.isMember) : false;
      applyMembershipFromApi(memberFromApi, optimisticMemberRef, setIsMember);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load club";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [groupId, canWrite, getSessionClient]);

  loadRef.current = load;

  useEffect(() => {
    void load();
  }, [load]);

  const join = useCallback(async () => {
    if (!groupId) return false;
    if (!canWrite) {
      promptWriteAccess();
      toast.info("Link your Orb account to join the club");
      return false;
    }

    setJoining(true);
    try {
      const client = await getSessionClient();
      const result = await joinGroup(client, { group: evmAddress(groupId) });
      if (result.isErr()) throw new Error(result.error.message);
      toast.success("Joined club — you can now access the feed");
      optimisticMemberRef.current = true;
      setIsMember(true);

      void (async () => {
        for (const delayMs of MEMBERSHIP_SYNC_DELAYS_MS) {
          await sleep(delayMs);
          try {
            const pollClient = await getSessionClient();
            const groupResult = await fetchGroup(pollClient, {
              group: evmAddress(groupId),
            });
            if (groupResult.isErr() || !groupResult.value) continue;

            const ops = groupResult.value.operations;
            const memberFromApi =
              ops && "isMember" in ops ? Boolean(ops.isMember) : false;
            if (!memberFromApi) continue;

            optimisticMemberRef.current = false;
            await loadRef.current?.();
            return;
          } catch {
            // Indexer may still be behind; keep polling.
          }
        }
      })();

      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join club");
      return false;
    } finally {
      setJoining(false);
    }
  }, [groupId, canWrite, getSessionClient, promptWriteAccess]);

  return {
    groupId,
    name,
    description,
    isMember,
    loading,
    joining,
    error,
    canWrite,
    refresh: load,
    join,
  };
}
