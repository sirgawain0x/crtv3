"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tv } from "lucide-react";
import { getBrandChannelPath } from "@/lib/channels/brand-channels";

interface CreatorBrandChannelButtonProps {
  brandChannelSlug: string | null | undefined;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}

export function CreatorBrandChannelButton({
  brandChannelSlug,
  variant = "outline",
  size = "sm",
}: CreatorBrandChannelButtonProps) {
  const channelPath = getBrandChannelPath(brandChannelSlug);
  if (!channelPath) return null;

  return (
    <Button variant={variant} size={size} asChild>
      <Link href={channelPath}>
        <Tv className="h-4 w-4 mr-2" />
        Channel
      </Link>
    </Button>
  );
}
