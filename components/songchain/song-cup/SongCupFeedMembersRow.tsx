"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnyClient } from "@lens-protocol/client";
import { fetchGroupMembers } from "@lens-protocol/client/actions";
import { evmAddress } from "@lens-protocol/types";
import { createLensClient } from "@/lib/sdk/lens/create-client";
import { useLensOrbWrite } from "@/hooks/useLensOrbWrite";
import { clearStaleOrbSessionIfNeeded } from "@/lib/sdk/orb/session-errors";
import { convertFailingGateway } from "@/lib/utils/image-gateway";
import makeBlockie from "ethereum-blockies-base64";
import { toast } from "sonner";
import { cn } from "@/lib/utils/utils";
import { songCupMuted } from "@/lib/songchain/song-cup/panel-styles";

type Member = {
  account: string;
  avatarUrl?: string | null;
  handle?: string | null;
};

type SongCupFeedMembersRowProps = {
  groupId: string | null;
  orbClubUrl?: string;
};

const MAX_AVATARS = 6;

function normalizeAvatar(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return convertFailingGateway(raw);
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const nested =
      typeof obj.uri === "string"
        ? obj.uri
        : typeof obj.url === "string"
          ? obj.url
          : typeof obj.src === "string"
            ? obj.src
            : null;
    return nested ? convertFailingGateway(nested) : null;
  }
  return null;
}

export function SongCupFeedMembersRow({ groupId, orbClubUrl }: SongCupFeedMembersRowProps) {
  const { canWrite, getSessionClient } = useLensOrbWrite();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
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

      const result = await fetchGroupMembers(client, {
        group: evmAddress(groupId),
        pageSize: "TEN",
      });
      if (result.isOk()) {
        setMembers(
          result.value.items.slice(0, MAX_AVATARS).map((item) => {
            const account =
              typeof item.account === "string"
                ? item.account
                : (item.account as { address?: string })?.address ?? "";
            const metadata =
              item.account && typeof item.account === "object"
                ? (item.account as { metadata?: unknown }).metadata
                : null;
            const avatarUrl = normalizeAvatar(
              metadata && typeof metadata === "object"
                ? (metadata as { picture?: unknown; avatar?: unknown }).picture ??
                    (metadata as { picture?: unknown; avatar?: unknown }).avatar
                : null,
            );
            const handle =
              metadata && typeof metadata === "object"
                ? (metadata as { username?: unknown; handle?: unknown }).username ??
                  (metadata as { username?: unknown; handle?: unknown }).handle
                : null;
            return {
              account,
              avatarUrl,
              handle: typeof handle === "string" ? handle : null,
            };
          }),
        );
      } else {
        console.error("Failed to load group members", result.error);
        toast.error("Could not load club members.");
      }
    } catch (err) {
      clearStaleOrbSessionIfNeeded(err);
      console.error("Error loading group members", err);
      toast.error("Could not load club members.");
    } finally {
      setLoading(false);
    }
  }, [groupId, canWrite, getSessionClient]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  if (!groupId) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center">
        {loading && members.length === 0 ? (
          <span className={cn("text-xs", songCupMuted)}>Loading members…</span>
        ) : (
          members.map((member, index) => (
            <div
              key={member.account}
              className="relative -ml-2 first:ml-0"
              style={{ zIndex: members.length - index }}
            >
              <img
                src={member.avatarUrl || makeBlockie(member.account)}
                alt={member.handle ?? member.account}
                className="h-[58px] w-[58px] rounded-full border-2 border-background object-cover dark:border-black"
              />
            </div>
          ))
        )}
      </div>
      {orbClubUrl && (
        <a
          href={orbClubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("text-[10px] font-semibold uppercase tracking-wide hover:underline", songCupMuted, "hover:text-fuchsia-600 dark:hover:text-[#fe01dc]")}
        >
          more
        </a>
      )}
    </div>
  );
}
