"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  songCupMatchupsService,
  type SongCupMatchup,
  type SongCupMatchupStatus,
} from "@/lib/sdk/supabase/song-cup-matchups";
import {
  songCupVotesService,
  tallyVotes,
  type SongCupVote,
  type SongCupVoteChoice,
} from "@/lib/sdk/supabase/song-cup-votes";
import { logger } from "@/lib/utils/logger";

export type SongCupMatchupWithVotes = SongCupMatchup & {
  votes: SongCupVote[];
  tally: ReturnType<typeof tallyVotes>;
  userChoice: SongCupVoteChoice | null;
};

export type SongCupMatchupFilter = "upcoming" | "past" | "all";

function filterMatchups(
  matchups: SongCupMatchup[],
  filter: SongCupMatchupFilter,
): SongCupMatchup[] {
  if (filter === "all") return matchups;
  return matchups.filter((m) => m.status === filter);
}

export function useSongCupMatchups(
  walletAddress: string | null,
  filter: SongCupMatchupFilter = "all",
) {
  const [matchups, setMatchups] = useState<SongCupMatchup[]>([]);
  const [votes, setVotes] = useState<SongCupVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await songCupMatchupsService.list();
      setMatchups(rows);
      const voteRows = await songCupVotesService.listForMatchups(rows.map((r) => r.id));
      setVotes(voteRows);
    } catch (err) {
      logger.error("[useSongCupMatchups] fetch failed:", err);
      setError("Failed to load matchups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const enriched = useMemo((): SongCupMatchupWithVotes[] => {
    const filtered = filterMatchups(matchups, filter);
    return filtered.map((matchup) => {
      const matchupVotes = votes.filter((v) => v.matchup_id === matchup.id);
      const userVote = walletAddress
        ? (matchupVotes.find(
            (v) => v.wallet_address.toLowerCase() === walletAddress.toLowerCase(),
          )?.choice ?? null)
        : null;
      return {
        ...matchup,
        votes: matchupVotes,
        tally: tallyVotes(matchupVotes),
        userChoice: userVote,
      };
    });
  }, [matchups, votes, filter, walletAddress]);

  const castVote = useCallback(
    async (matchupId: string, choice: SongCupVoteChoice) => {
      if (!walletAddress) return false;
      const row = await songCupVotesService.cast(matchupId, walletAddress, choice);
      if (!row) return false;
      setVotes((prev) => {
        const without = prev.filter(
          (v) =>
            !(
              v.matchup_id === matchupId &&
              v.wallet_address.toLowerCase() === walletAddress.toLowerCase()
            ),
        );
        return [...without, row];
      });
      return true;
    },
    [walletAddress],
  );

  const createMatchup = useCallback(
    async (data: Parameters<typeof songCupMatchupsService.create>[0]) => {
      const row = await songCupMatchupsService.create(data);
      if (row) {
        setMatchups((prev) => [row, ...prev]);
      }
      return row;
    },
    [],
  );

  const updateMatchupStatus = useCallback(async (id: string, status: SongCupMatchupStatus) => {
    const ok = await songCupMatchupsService.updateStatus(id, status);
    if (ok) {
      setMatchups((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status, updated_at: new Date().toISOString() } : m)),
      );
    }
    return ok;
  }, []);

  const removeMatchup = useCallback(async (id: string) => {
    const ok = await songCupMatchupsService.remove(id);
    if (ok) {
      setMatchups((prev) => prev.filter((m) => m.id !== id));
      setVotes((prev) => prev.filter((v) => v.matchup_id !== id));
    }
    return ok;
  }, []);

  return {
    matchups: enriched,
    isLoading,
    error,
    refetch: fetchAll,
    castVote,
    createMatchup,
    updateMatchupStatus,
    removeMatchup,
  };
}
