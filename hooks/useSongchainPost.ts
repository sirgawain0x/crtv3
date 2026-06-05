"use client";

import { useCallback, useState } from "react";
import { textOnly } from "@lens-protocol/metadata";
import { post } from "@lens-protocol/client/actions";
import { evmAddress, uri } from "@lens-protocol/client";
import { groveService } from "@/lib/sdk/grove/service";
import {
  clearStaleOrbSessionIfNeeded,
  isIncompleteOrbSessionError,
} from "@/lib/sdk/orb/session-errors";
import { formatOrbAuthError } from "@/lib/sdk/orb/format-auth-error";
import {
  checkLensFeedExists,
  formatLensFeedPostError,
  resolveSongchainFeedAddress,
} from "@/lib/songchain/lens-feed";
import { getLensContractAddressError } from "@/lib/sdk/lens/primitive-id";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { toast } from "sonner";

export type CreateSongchainPostParams = {
  content: string;
  feedId: string;
  title?: string;
};

export function useSongchainPost() {
  const [isPosting, setIsPosting] = useState(false);
  const {
    canWrite,
    needsOrbReauth,
    getSessionClient,
    promptWriteAccess,
  } = useLensOrbWrite();

  const createPost = useCallback(
    async ({ content, feedId, title = "Songchain post" }: CreateSongchainPostParams) => {
      const trimmed = content.trim();
      if (!trimmed) {
        toast.error("Write something before posting.");
        return false;
      }
      if (!feedId) {
        toast.error("Feed is not configured.");
        return false;
      }

      const feedAddress = resolveSongchainFeedAddress(feedId);
      if (!feedAddress) {
        toast.error(getLensContractAddressError(feedId, "Feed contract ID") ?? "Invalid feed ID.");
        return false;
      }

      const feedCheck = await checkLensFeedExists(feedId);
      if (!feedCheck.exists) {
        toast.error(feedCheck.error ?? "Feed is not available on this Lens network.");
        return false;
      }

      if (!canWrite) {
        promptWriteAccess();
        toast.info(
          needsOrbReauth
            ? "Sign in again with Orb to post on Lens."
            : "Link your Orb account to post on Lens.",
        );
        return false;
      }

      setIsPosting(true);
      try {
        const client = await getSessionClient();
        const metadata = textOnly({
          content: trimmed,
          locale: "en",
        });

        const uploadResult = await groveService.uploadJson(metadata);
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error("Failed to upload post metadata");
        }

        const result = await post(client, {
          contentUri: uri(uploadResult.url),
          feed: evmAddress(feedAddress),
        });

        if (result.isErr()) {
          throw new Error(result.error.message);
        }

        toast.success("Posted to Songchain feed!");
        return true;
      } catch (err) {
        const cleared = clearStaleOrbSessionIfNeeded(err);
        if (cleared || isIncompleteOrbSessionError(err)) {
          promptWriteAccess();
        }
        toast.error(
          isIncompleteOrbSessionError(err)
            ? formatOrbAuthError(err)
            : formatLensFeedPostError(err, feedId),
        );
        return false;
      } finally {
        setIsPosting(false);
      }
    },
    [canWrite, needsOrbReauth, getSessionClient, promptWriteAccess],
  );

  return { createPost, isPosting, canWrite, needsOrbReauth, promptWriteAccess };
}
