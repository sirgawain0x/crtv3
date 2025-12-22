"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddressWithCopy } from "@/components/Creator/AddressWithCopy";
import { convertFailingGateway } from "@/lib/utils/image-gateway";
import makeBlockie from "ethereum-blockies-base64";
import { shortenAddress } from "@/lib/utils/utils";
import { MeToken, CreatorProfile } from "@/lib/sdk/supabase/client";
import { Badge } from "@/components/ui/badge";

interface CreatorProfileHeaderProps {
  address: string;
  creatorProfile: CreatorProfile | null;
  meToken: MeToken | null;
  bio: string | null;
}

export function CreatorProfileHeader({
  address,
  creatorProfile,
  meToken,
  bio,
}: CreatorProfileHeaderProps) {
  // Determine display name and symbol
  const displayName = meToken?.name || creatorProfile?.username || shortenAddress(address);
  const displaySymbol = meToken?.symbol || null;
  const avatarUrl = creatorProfile?.avatar_url
    ? convertFailingGateway(creatorProfile.avatar_url)
    : makeBlockie(address);

  const avatarFallback = displayName
    ? displayName.charAt(0).toUpperCase()
    : displaySymbol
    ? displaySymbol.slice(0, 2).toUpperCase()
    : address.slice(2, 3).toUpperCase() || "C";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback>
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold">{displayName}</h1>
          {displaySymbol && (
            <Badge variant="secondary" className="text-sm">
              {displaySymbol}
            </Badge>
          )}
        </div>
        <div className="mb-4">
          <AddressWithCopy address={address} />
        </div>
        {bio && (
          <p className="text-sm text-muted-foreground max-w-2xl">
            {bio}
          </p>
        )}
      </div>
    </div>
  );
}

