"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { CreatorProfile } from "@/lib/sdk/supabase/client";
import { creatorProfileSupabaseService } from "@/lib/sdk/supabase/creator-profiles";
import { TwinChatPanel } from "./TwinChatPanel";
import { logger } from "@/lib/utils/logger";

const TwinAvatarCanvas = dynamic(() => import("./TwinAvatarCanvas"), {
  ssr: false,
  loading: () => null,
});

interface DigitalTwinOverlayProps {
  creatorAddress?: string | null;
  streamId?: string | null;
}

export function DigitalTwinOverlay({
  creatorAddress,
  streamId,
}: DigitalTwinOverlayProps) {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!creatorAddress) {
      setProfile(null);
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const p = await creatorProfileSupabaseService.getCreatorProfileByOwner(
          creatorAddress
        );
        if (!cancelled) setProfile(p);
      } catch (err) {
        logger.error("DigitalTwinOverlay: failed to load creator profile", err);
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creatorAddress]);

  if (!loaded || !profile?.twin_enabled) return null;

  if (profile.twin_avatar_glb_url) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-30 h-48 w-48 rounded-lg overflow-hidden">
        <div className="pointer-events-auto h-full w-full">
          <TwinAvatarCanvas glbUrl={profile.twin_avatar_glb_url} />
        </div>
      </div>
    );
  }

  if (profile.twin_chat_endpoint && creatorAddress && streamId) {
    return (
      <TwinChatPanel
        creatorAddress={creatorAddress}
        streamId={streamId}
        twinName={profile.username ? `${profile.username}'s twin` : undefined}
      />
    );
  }

  return null;
}
