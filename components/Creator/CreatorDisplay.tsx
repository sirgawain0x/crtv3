"use client";

import Link from "next/link";
import { UserDisplay } from "@/components/User/UserDisplay";

interface CreatorDisplayProps {
  creatorAddress: string;
  className?: string;
}

export function CreatorDisplay({ creatorAddress, className }: CreatorDisplayProps) {
  return (
    <Link
      href={`/creator/${creatorAddress}`}
      className={`flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer ${className || ""}`}
    >
      <UserDisplay
        address={creatorAddress}
        avatarSize="md"
        showAddress={true}
        clickable={false}
        variant="inline"
      />
    </Link>
  );
}

