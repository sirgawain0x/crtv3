"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@account-kit/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { useLiveChat, type UseLiveChatReturn, type LiveChatMessage } from "./useLiveChat";
import {
  addModerator as addModeratorAction,
  banUser as banUserAction,
  getModerationState,
  hideMessage as hideMessageAction,
  removeModerator as removeModeratorAction,
  unbanUser as unbanUserAction,
  unhideMessage as unhideMessageAction,
  type ModerationState,
} from "@/services/stream-moderation";
import { logger } from "@/lib/utils/logger";

const MODERATION_POLL_MS = 10_000;

export interface UseLiveChatModeratedReturn extends UseLiveChatReturn {
  isModerator: boolean;
  isCreator: boolean;
  canModerate: boolean;
  moderationState: ModerationState;
  moderationError: Error | null;
  refreshModeration: () => Promise<void>;
  hideMessage: (messageId: string) => Promise<void>;
  unhideMessage: (messageId: string) => Promise<void>;
  banUser: (address: string) => Promise<void>;
  unbanUser: (address: string) => Promise<void>;
  addModerator: (address: string) => Promise<void>;
  removeModerator: (address: string) => Promise<void>;
}

export interface UseLiveChatModeratedOptions {
  maxMessages?: number;
  messageRetentionMs?: number;
  rateLimit?: { count: number; windowMs: number };
  /** Address of the stream creator. */
  creatorAddress?: string | null;
  /** Whether to enable moderation features. Defaults to true. */
  enabled?: boolean;
}

const EMPTY_STATE: ModerationState = {
  hiddenIds: [],
  bannedAddresses: [],
  moderators: [],
};

/**
 * Wraps `useLiveChat` with a moderation overlay backed by Supabase.
 *
 * - Reads `getModerationState` on a 10s poll plus an immediate refresh after
 *   any local mutation, so changes propagate to all viewers within ~10s.
 * - Filters messages by hidden IDs and banned senderAddresses (XMTP inbox IDs).
 * - Exposes mutation helpers that delegate to the server actions, which enforce
 *   creator-or-moderator authorization.
 */
export function useLiveChatModerated(
  streamId: string,
  sessionId: string,
  options: UseLiveChatModeratedOptions = {}
): UseLiveChatModeratedReturn {
  const { creatorAddress, enabled = true, ...liveChatOptions } = options;
  const base = useLiveChat(streamId, sessionId, liveChatOptions);

  const user = useUser();
  const { address: smartAccountAddress } = useModularAccount();
  const actorAddress = (smartAccountAddress || user?.address || null)?.toLowerCase() || null;

  const [state, setState] = useState<ModerationState>(EMPTY_STATE);
  const [moderationError, setModerationError] = useState<Error | null>(null);
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || !streamId) return;
    try {
      const next = await getModerationState(streamId);
      if (!stopped.current) {
        setState(next);
        setModerationError(null);
      }
    } catch (err) {
      logger.error("Failed to fetch moderation state:", err);
      if (!stopped.current) {
        setModerationError(err instanceof Error ? err : new Error("Moderation fetch failed"));
      }
    }
  }, [enabled, streamId]);

  useEffect(() => {
    stopped.current = false;
    if (!enabled || !streamId) return;
    refresh();
    const interval = setInterval(refresh, MODERATION_POLL_MS);
    return () => {
      stopped.current = true;
      clearInterval(interval);
    };
  }, [enabled, streamId, refresh]);

  const isCreator = useMemo(() => {
    if (!creatorAddress || !actorAddress) return false;
    return creatorAddress.toLowerCase() === actorAddress;
  }, [creatorAddress, actorAddress]);

  const isModerator = useMemo(() => {
    if (!actorAddress) return false;
    return state.moderators.includes(actorAddress);
  }, [state.moderators, actorAddress]);

  const canModerate = isCreator || isModerator;

  const filteredMessages = useMemo<LiveChatMessage[]>(() => {
    if (!enabled) return base.messages;
    if (state.hiddenIds.length === 0 && state.bannedAddresses.length === 0) {
      return base.messages;
    }
    const hiddenSet = new Set(state.hiddenIds);
    const bannedSet = new Set(state.bannedAddresses);
    return base.messages.filter((msg) => {
      if (hiddenSet.has(msg.id)) return false;
      if (msg.senderAddress && bannedSet.has(msg.senderAddress.toLowerCase())) return false;
      return true;
    });
  }, [base.messages, state, enabled]);

  const requireActor = useCallback(() => {
    if (!actorAddress) {
      throw new Error("Connect your wallet to moderate");
    }
    return actorAddress;
  }, [actorAddress]);

  const hideMessage = useCallback(
    async (messageId: string) => {
      const actor = requireActor();
      await hideMessageAction(streamId, messageId, actor);
      // Optimistic add so the UI updates immediately.
      setState((prev) =>
        prev.hiddenIds.includes(messageId)
          ? prev
          : { ...prev, hiddenIds: [...prev.hiddenIds, messageId] }
      );
      refresh();
    },
    [streamId, requireActor, refresh]
  );

  const unhideMessage = useCallback(
    async (messageId: string) => {
      const actor = requireActor();
      await unhideMessageAction(streamId, messageId, actor);
      setState((prev) => ({
        ...prev,
        hiddenIds: prev.hiddenIds.filter((id) => id !== messageId),
      }));
      refresh();
    },
    [streamId, requireActor, refresh]
  );

  const banUser = useCallback(
    async (address: string) => {
      const actor = requireActor();
      const lower = address.toLowerCase();
      await banUserAction(streamId, lower, actor);
      setState((prev) =>
        prev.bannedAddresses.includes(lower)
          ? prev
          : { ...prev, bannedAddresses: [...prev.bannedAddresses, lower] }
      );
      refresh();
    },
    [streamId, requireActor, refresh]
  );

  const unbanUser = useCallback(
    async (address: string) => {
      const actor = requireActor();
      const lower = address.toLowerCase();
      await unbanUserAction(streamId, lower, actor);
      setState((prev) => ({
        ...prev,
        bannedAddresses: prev.bannedAddresses.filter((a) => a !== lower),
      }));
      refresh();
    },
    [streamId, requireActor, refresh]
  );

  const addModerator = useCallback(
    async (address: string) => {
      const actor = requireActor();
      await addModeratorAction(streamId, address, actor);
      const lower = address.toLowerCase();
      setState((prev) =>
        prev.moderators.includes(lower)
          ? prev
          : { ...prev, moderators: [...prev.moderators, lower] }
      );
      refresh();
    },
    [streamId, requireActor, refresh]
  );

  const removeModerator = useCallback(
    async (address: string) => {
      const actor = requireActor();
      await removeModeratorAction(streamId, address, actor);
      const lower = address.toLowerCase();
      setState((prev) => ({
        ...prev,
        moderators: prev.moderators.filter((m) => m !== lower),
      }));
      refresh();
    },
    [streamId, requireActor, refresh]
  );

  return {
    ...base,
    messages: filteredMessages,
    isModerator,
    isCreator,
    canModerate,
    moderationState: state,
    moderationError,
    refreshModeration: refresh,
    hideMessage,
    unhideMessage,
    banUser,
    unbanUser,
    addModerator,
    removeModerator,
  };
}
