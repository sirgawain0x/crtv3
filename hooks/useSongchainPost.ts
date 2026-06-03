"use client";

import { useCallback, useState } from "react";
import { textOnly } from "@lens-protocol/metadata";
import { post } from "@lens-protocol/client/actions";
import { evmAddress, uri } from "@lens-protocol/client";
import { groveService } from "@/lib/sdk/grove/service";
import { clearStaleOrbSessionIfNeeded } from "@/lib/sdk/orb/session-errors";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { toast } from "sonner";

export type CreateSongchainPostParams = {
  content: string;
  feedId: string;
  title?: string;
};

export function useSongchainPost() {
  const [isPosting, setIsPosting] = useState(false);
  const { canWrite, getSessionClient, promptWriteAccess } = useLensOrbWrite();

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
      if (!canWrite) {
        promptWriteAccess();
        toast.info("Link your Orb account to post on Lens.");
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
          feed: evmAddress(feedId),
        });

        if (result.isErr()) {
          throw new Error(result.error.message);
        }

        toast.success("Posted to Songchain feed!");
        return true;
      } catch (err) {
        clearStaleOrbSessionIfNeeded(err);
        toast.error(err instanceof Error ? err.message : "Posting failed");
        return false;
      } finally {
        setIsPosting(false);
      }
    },
    [canWrite, getSessionClient, promptWriteAccess],
  );

  return { createPost, isPosting, canWrite, promptWriteAccess };
}
