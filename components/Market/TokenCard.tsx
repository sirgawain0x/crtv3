"use client";

import { useState } from 'react';
import { MarketToken } from '@/app/api/market/tokens/route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Play, Coins, BarChart3 } from 'lucide-react';
import { convertFailingGateway } from '@/lib/utils/image-gateway';
import Link from 'next/link';
import Image from 'next/image';
import { TokenChartDialog } from './TokenChartDialog';

interface TokenCardProps {
  token: MarketToken;
  onQuickTrade?: (token: MarketToken) => void;
  showChart?: boolean;
}

export function TokenCard({ token, onQuickTrade, showChart = false }: TokenCardProps) {
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const priceChange = token.price_change_24h || 0;
  const isPositive = priceChange >= 0;
  const isContentCoin = token.type === 'content_coin';

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar/Thumbnail */}
            {isContentCoin && token.thumbnail_url ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={convertFailingGateway(token.thumbnail_url)}
                  alt={token.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Play className="h-4 w-4 text-white" />
                </div>
              </div>
            ) : token.creator_avatar_url ? (
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage
                  src={convertFailingGateway(token.creator_avatar_url)}
                  alt={token.symbol}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {token.symbol.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Coins className="h-6 w-6 text-primary" />
              </div>
            )}

            {/* Token Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={token.owner_address ? `/creator/${token.owner_address}` : '#'}
                  className="font-semibold text-base hover:underline truncate"
                >
                  {token.symbol}
                </Link>
                {isContentCoin && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    Content
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{token.name}</p>
              {token.creator_username && (
                <p className="text-xs text-muted-foreground">by {token.creator_username}</p>
              )}
            </div>
          </div>

          {/* Price Change Badge */}
          {priceChange !== 0 && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                isPositive
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? '+' : ''}
              {priceChange.toFixed(2)}%
            </div>
          )}
        </div>

        {/* Price and Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Price</p>
            <p className="text-lg font-semibold">${token.price.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">TVL</p>
            <p className="text-lg font-semibold">{formatCurrency(token.tvl)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onQuickTrade?.(token)}
          >
            Quick Trade
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setChartDialogOpen(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Chart
          </Button>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Market Cap: {formatCurrency(token.market_cap)}</span>
          {token.volume_24h !== undefined && token.volume_24h > 0 && (
            <span>24h Vol: {formatCurrency(token.volume_24h)}</span>
          )}
        </div>

        {/* Content Coin Video Link */}
        {isContentCoin && token.video_title && (
          <div className="pt-2 border-t">
            <Link
              href={token.playback_id ? `/watch/${token.playback_id}` : '#'}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              Watch: {token.video_title}
            </Link>
          </div>
        )}
      </CardContent>

      {/* Chart Dialog */}
      <TokenChartDialog
        open={chartDialogOpen}
        onOpenChange={setChartDialogOpen}
        token={token}
      />
    </Card>
  );
}

