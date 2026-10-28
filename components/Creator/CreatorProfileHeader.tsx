"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddressWithCopy } from "@/components/Creator/AddressWithCopy";
import { convertFailingGateway } from "@/lib/utils/image-gateway";
import makeBlockie from "ethereum-blockies-base64";
import { shortenAddress } from "@/lib/utils/utils";
import { MeToken, CreatorProfile } from "@/lib/sdk/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { QuickTradeDialog } from "@/components/Market/QuickTradeDialog";
import { TokenChartDialog } from "@/components/Market/TokenChartDialog";
import { MarketToken } from "@/app/api/market/tokens/route";
import { MeTokenShareButton } from "@/components/Market/MeTokenShareButton";
import { MembershipVerifiedBadge } from "@/components/User/MembershipVerifiedBadge";
import { CreatorPredictButton } from "@/components/Creator/CreatorPredictButton";
import { ProfileGoLiveButton } from "@/components/Live/ProfileGoLiveButton";
import { CreatorBrandChannelButton } from "@/components/Creator/CreatorBrandChannelButton";
import { CreatorSocialLinks } from "@/components/Creator/CreatorSocialLinks";
import { useMeTokenMarketStats } from "@/lib/hooks/market/useMeTokenMarketStats";
import { formatUsdTokenPrice } from "@/lib/metokens/spotPrice";

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
  const copyAddress = meToken?.address ?? address;
  const avatarUrl = creatorProfile?.avatar_url
    ? convertFailingGateway(creatorProfile.avatar_url)
    : makeBlockie(address);

  const avatarFallback = displayName
    ? displayName.charAt(0).toUpperCase()
    : displaySymbol
      ? displaySymbol.slice(0, 2).toUpperCase()
      : address.slice(2, 3).toUpperCase() || "C";

  const [quickTradeOpen, setQuickTradeOpen] = useState(false);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const { stats: marketStats } = useMeTokenMarketStats(meToken?.address);

  // Convert MeToken to MarketToken for dialogs (price/TVL from market API — same as Trading Market)
  const marketToken: MarketToken | null = meToken ? {
    id: meToken.id,
    address: meToken.address,
    name: meToken.name,
    symbol: meToken.symbol,
    owner_address: meToken.owner_address,
    type: 'metoken',
    price: marketStats?.price ?? 0,
    tvl: marketStats?.tvl ?? meToken.tvl,
    total_supply: marketStats?.total_supply ?? meToken.total_supply?.toString() ?? '0',
    market_cap: marketStats?.market_cap ?? meToken.tvl,
    price_change_24h: marketStats?.price_change_24h,
    volume_24h: marketStats?.volume_24h,
    created_at: meToken.created_at,
    creator_username: creatorProfile?.username,
    creator_avatar_url: creatorProfile?.avatar_url,
  } : null;

  const displayPrice = marketStats?.price;
  const displayTvl = marketStats?.tvl ?? meToken?.tvl;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback>
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="text-3xl font-bold">{displayName}</h1>
          {displaySymbol && (
            <Badge variant="secondary" className="text-sm">
              {displaySymbol}
            </Badge>
          )}
        </div>
        <div className="mb-4">
          <AddressWithCopy address={copyAddress} />
        </div>

        {creatorProfile?.username && (
          <p className="text-lg font-medium mb-2 flex items-center gap-1.5">
            {creatorProfile.username}
            <MembershipVerifiedBadge address={address} size="md" />
          </p>
        )}

        {bio && (
          <p className="text-sm text-muted-foreground max-w-2xl">
            {bio}
          </p>
        )}

        <CreatorSocialLinks
          className="mt-3"
          socialOrbUrl={creatorProfile?.social_orb_url}
          socialInstagramUrl={creatorProfile?.social_instagram_url}
          socialXUrl={creatorProfile?.social_x_url}
        />

        {meToken && displayPrice != null && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-3 text-sm">
            <p>
              <span className="text-muted-foreground">Price </span>
              <span className="font-semibold">{formatUsdTokenPrice(displayPrice)}</span>
            </p>
            {displayTvl != null && (
              <p>
                <span className="text-muted-foreground">TVL </span>
                <span className="font-semibold">${displayTvl.toFixed(2)}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <ProfileGoLiveButton profileAddress={address} />
          <CreatorBrandChannelButton
            brandChannelSlug={creatorProfile?.brand_channel_slug}
          />
          {marketToken ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setQuickTradeOpen(true)}
              >
                Quick Trade
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChartDialogOpen(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Chart
              </Button>
              <CreatorPredictButton
                creatorAddress={address}
                creatorName={creatorProfile?.username || marketToken.name}
              />
              <MeTokenShareButton
                creatorOwnerAddress={address}
                symbol={marketToken.symbol}
                name={marketToken.name}
                type="creator"
              />
            </>
          ) : null}
        </div>
      </div>

      <QuickTradeDialog
        open={quickTradeOpen}
        onOpenChange={setQuickTradeOpen}
        token={marketToken}
      />

      {marketToken && (
        <TokenChartDialog
          open={chartDialogOpen}
          onOpenChange={setChartDialogOpen}
          token={marketToken}
        />
      )}
    </div>
  );
}
