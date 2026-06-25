"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnyClient } from "@lens-protocol/client";
import { fetchGroupMembers } from "@lens-protocol/client/actions";
import { evmAddress } from "@lens-protocol/types";
import { createLensClient } from "@/lib/sdk/lens/create-client";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { clearStaleOrbSessionIfNeeded } from "@/lib/sdk/orb/session-errors";
import { toast } from "sonner";

export type SongCupGroupMember = {
  address: string;
  username?: string | null;
};

const PAGE_SIZE = 50;

export function useSongCupGroupMembers(groupId: string | null) {
  const { canWrite, getSessionClient } = useLensOrbWrite();
  const [members, setMembers] = useState<SongCupGroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!groupId) {
      setMembers([]);
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

      const all: SongCupGroupMember[] = [];
      let cursor: string | undefined;

      do {
        const result = await fetchGroupMembers(client, {
          group: evmAddress(groupId),
          pageSize: PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
        });

        if (result.isErr()) throw new Error(result.error.message);

        const page = result.value.items.map((item) => ({
          address: item.account.address,
          username: item.account.username?.localName ?? null,
        }));

        all.push(...page);
        cursor = result.value.pageInfo.next ?? undefined;
      } while (cursor && all.length < 500);

      setMembers(all);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load club members";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [groupId, canWrite, getSessionClient]);

  useEffect(() => {
    void load();
  }, [load]);

  return { members, loading, error, refresh: load };
}
