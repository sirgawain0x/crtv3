"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@account-kit/react";
import useModularAccount from "@/lib/hooks/accountkit/useModularAccount";
import { useLiveChat, type LiveChatMessage } from "./useLiveChat";
import {
  getModerationState,
  hideMessage as hideMessageAction,
  unhideMessage as unhideMessageAction,
  banUser as banUserAction,
  unbanUser as unbanUserAction,
  type ModerationState,
} from "@/services/stream-moderation";
import { logger } from "@/lib/utils/logger";

interface UseLiveChatModeratedOptions {
  maxMessages?: number;
  messageRetentionMs?: number;
  rateLimit?: { count: number; windowMs: number };
  pollIntervalMs?: number;
}

export interface UseLiveChatModeratedReturn {
  messages: LiveChatMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  sendTipMessage: (
    amount: string,
    token: "ETH" | "USDC" | "DAI",
    txHash: string
  ) => Promise<void>;
  isSending: boolean;
  canModerate: boolean;
  isCreator: boolean;
  isBannedSelf: boolean;
  hideMessage: (messageId: string) => Promise<void>;
  banUser: (address: string) => Promise<void>;
  unbanUser: (address: string) => Promise<void>;
  unhideMessage: (messageId: string) => Promise<void>;
  moderationState: ModerationState;
  refreshModeration: () => Promise<void>;
}

/**
 * Wraps useLiveChat with stream-level moderation:
 * - filters out hidden message IDs and messages from banned senders
 * - exposes hide/ban actions for moderators (creator + appointed addresses)
 * - blocks the local user from sending if they're banned on this stream
 */
export function useLiveChatModerated(
  streamId: string,
  sessionId: string,
  options?: UseLiveChatModeratedOptions
): UseLiveChatModeratedReturn {
  const base = useLiveChat(streamId, sessionId, options);
  const user = useUser();
  const { address: smartAccountAddress } = useModularAccount();
  const callerAddress = (smartAccountAddress || user?.address || "").toLowerCase();

  const [moderation, setModeration] = useState<ModerationState>({
    hiddenIds: [],
    bannedAddresses: [],
    moderators: [],
    creatorAddress: null,
  });

  const refreshModeration = useCallback(async () => {
    if (!streamId) return;
    try {
      const state = await getModerationState(streamId);
      setModeration(state);
    } catch (err) {
      logger.error("Failed to load moderation state:", err);
    }
  }, [streamId]);

  // Initial load + polling.
  useEffect(() => {
    refreshModeration();
    const interval = options?.pollIntervalMs ?? 10000;
    const timer = setInterval(refreshModeration, interval);
    return () => clearInterval(timer);
  }, [refreshModeration, options?.pollIntervalMs]);

  const hiddenSet = useMemo(
    () => new Set(moderation.hiddenIds),
    [moderation.hiddenIds]
  );
  const bannedSet = useMemo(
    () => new Set(moderation.bannedAddresses),
    [moderation.bannedAddresses]
  );

  const filteredMessages = useMemo(
    () =>
      base.messages.filter((msg) => {
        if (hiddenSet.has(msg.id)) return false;
        if (
          msg.senderAddress &&
          bannedSet.has(msg.senderAddress.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [base.messages, hiddenSet, bannedSet]
  );

  const isCreator =
    !!callerAddress &&
    !!moderation.creatorAddress &&
    callerAddress === moderation.creatorAddress;
  const isAppointedModerator =
    !!callerAddress && moderation.moderators.includes(callerAddress);
  const canModerate = isCreator || isAppointedModerator;
  const isBannedSelf = !!callerAddress && bannedSet.has(callerAddress);

  // Block sending if we're banned. We don't reach into useLiveChat's queue —
  // we just intercept the send call here.
  const sendMessage = useCallback(
    async (content: string) => {
      if (isBannedSelf) {
        logger.warn("Blocked send: caller is banned on this stream");
        return;
      }
      await base.sendMessage(content);
    },
    [base, isBannedSelf]
  );

  const lastActionAt = useRef(0);
  const triggerRefreshSoon = useCallback(() => {
    // Debounce optimistic refresh after a moderation action.
    lastActionAt.current = Date.now();
    setTimeout(() => {
      if (Date.now() - lastActionAt.current >= 250) {
        refreshModeration();
      }
    }, 300);
  }, [refreshModeration]);

  const hideMessage = useCallback(
    async (messageId: string) => {
      if (!callerAddress) throw new Error("Connect a wallet first");
      await hideMessageAction(streamId, messageId, callerAddress);
      setModeration((prev) => ({
        ...prev,
        hiddenIds: prev.hiddenIds.includes(messageId)
          ? prev.hiddenIds
          : [...prev.hiddenIds, messageId],
      }));
      triggerRefreshSoon();
    },
    [streamId, callerAddress, triggerRefreshSoon]
  );

  const unhideMessage = useCallback(
    async (messageId: string) => {
      if (!callerAddress) throw new Error("Connect a wallet first");
      await unhideMessageAction(streamId, messageId, callerAddress);
      setModeration((prev) => ({
        ...prev,
        hiddenIds: prev.hiddenIds.filter((id) => id !== messageId),
      }));
      triggerRefreshSoon();
    },
    [streamId, callerAddress, triggerRefreshSoon]
  );

  const banUser = useCallback(
    async (address: string) => {
      if (!callerAddress) throw new Error("Connect a wallet first");
      const normalized = address.toLowerCase();
      await banUserAction(streamId, normalized, callerAddress);
      setModeration((prev) => ({
        ...prev,
        bannedAddresses: prev.bannedAddresses.includes(normalized)
          ? prev.bannedAddresses
          : [...prev.bannedAddresses, normalized],
      }));
      triggerRefreshSoon();
    },
    [streamId, callerAddress, triggerRefreshSoon]
  );

  const unbanUser = useCallback(
    async (address: string) => {
      if (!callerAddress) throw new Error("Connect a wallet first");
      const normalized = address.toLowerCase();
      await unbanUserAction(streamId, normalized, callerAddress);
      setModeration((prev) => ({
        ...prev,
        bannedAddresses: prev.bannedAddresses.filter((a) => a !== normalized),
      }));
      triggerRefreshSoon();
    },
    [streamId, callerAddress, triggerRefreshSoon]
  );

  return {
    messages: filteredMessages,
    isLoading: base.isLoading,
    error: base.error,
    sendMessage,
    sendTipMessage: base.sendTipMessage,
    isSending: base.isSending,
    canModerate,
    isCreator,
    isBannedSelf,
    hideMessage,
    unhideMessage,
    banUser,
    unbanUser,
    moderationState: moderation,
    refreshModeration,
  };
}
