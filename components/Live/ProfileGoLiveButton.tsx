"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMembershipContext } from "@/lib/context/MembershipContext";
import {
  hasValidBrandPass,
  hasValidCreatorPass,
} from "@/lib/access/creator-membership";
import { useSmartWalletDisplayAddress } from "@/lib/hooks/accountkit/useSmartWalletDisplayAddress";
import { cn } from "@/lib/utils";

type ProfileGoLiveButtonProps = {
  profileAddress: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
};

type CreatorStreamMeta = {
  playback_id: string | null;
  is_live: boolean;
};

/**
 * Profile CTA for live channels.
 * - Owner with Creator/Brand pass: "Go Live" → /live/[address]
 * - Visitors when a stream exists: "Watch" / "Live" → /live/[address]
 */
export function ProfileGoLiveButton({
  profileAddress,
  className,
  size = "sm",
  variant,
}: ProfileGoLiveButtonProps) {
  const normalizedProfile = profileAddress.toLowerCase();
  const { membershipDetails, isLoading: membershipLoading } =
    useMembershipContext();
  const {
    primaryAddress,
    smartAccountAddress,
    signerAddress,
  } = useSmartWalletDisplayAddress();

  const [stream, setStream] = useState<CreatorStreamMeta | null>(null);
  const [streamLoading, setStreamLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStreamLoading(true);
      try {
        const res = await fetch(
          `/api/streams/creator/${encodeURIComponent(normalizedProfile)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (!cancelled) setStream(null);
          return;
        }
        const data = (await res.json()) as {
          playback_id?: string | null;
          is_live?: boolean;
        };
        if (!cancelled) {
          setStream({
            playback_id: data.playback_id ?? null,
            is_live: Boolean(data.is_live),
          });
        }
      } catch {
        if (!cancelled) setStream(null);
      } finally {
        if (!cancelled) setStreamLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [normalizedProfile]);

  const isOwner = useMemo(() => {
    const candidates = [primaryAddress, smartAccountAddress, signerAddress]
      .filter(Boolean)
      .map((a) => a!.toLowerCase());
    return candidates.includes(normalizedProfile);
  }, [normalizedProfile, primaryAddress, smartAccountAddress, signerAddress]);

  const canBroadcast =
    isOwner &&
    (hasValidCreatorPass(membershipDetails) ||
      hasValidBrandPass(membershipDetails));

  const hasStream = Boolean(stream?.playback_id);
  const isLive = Boolean(stream?.is_live);

  if (streamLoading || (isOwner && membershipLoading)) {
    return null;
  }

  if (!canBroadcast && !hasStream) {
    return null;
  }

  const href = `/live/${normalizedProfile}`;
  const label = canBroadcast ? "Go Live" : isLive ? "Live" : "Watch";
  const buttonVariant =
    variant ?? (canBroadcast || isLive ? "default" : "outline");

  return (
    <Button
      asChild
      size={size}
      variant={buttonVariant}
      className={cn(className)}
    >
      <Link href={href}>
        <RadioTower className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
