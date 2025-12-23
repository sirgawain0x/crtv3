"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMeTokenHoldings } from '@/lib/hooks/metokens/useMeTokenHoldings';
import { MeTokenHolding } from '@/lib/hooks/metokens/useMeTokenHoldings';
import {
  Wallet,
  TrendingUp,
  Users,
  Crown,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useUser } from '@account-kit/react';
import Link from 'next/link';
import { convertFailingGateway } from '@/lib/utils/image-gateway';

interface MeTokenPortfolioProps {
  targetAddress?: string;
  className?: string;
}

export function MeTokenPortfolio({ targetAddress, className }: MeTokenPortfolioProps) {
  const user = useUser();
  const { holdings, loading, error, totalValue, refreshHoldings } = useMeTokenHoldings(targetAddress);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshHoldings();
    setRefreshing(false);
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    } else {
      return num.toFixed(4);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            MeToken Portfolio
          </CardTitle>
          <CardDescription>Loading your MeToken holdings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            MeToken Portfolio
          </CardTitle>
          <CardDescription>Error loading your holdings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            MeToken Portfolio
          </CardTitle>
          <CardDescription>No MeToken holdings found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any MeToken holdings yet.
            </p>
            <Button asChild>
              <Link href="/explore">
                <TrendingUp className="h-4 w-4 mr-2" />
                Explore MeTokens
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ownMeToken = holdings.find(h => h.isOwnMeToken);
  const otherHoldings = holdings.filter(h => !h.isOwnMeToken);

  return (
    <div className={className}>
      {/* Portfolio Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                MeToken Portfolio
              </CardTitle>
              <CardDescription>
                {holdings.length} MeToken{holdings.length !== 1 ? 's' : ''} in your portfolio
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatValue(totalValue)}
              </div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {holdings.length}
              </div>
              <div className="text-sm text-muted-foreground">MeTokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {otherHoldings.length}
              </div>
              <div className="text-sm text-muted-foreground">Creators</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Own MeToken */}
      {ownMeToken && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Your MeToken
            </CardTitle>
            <CardDescription>MeToken you created</CardDescription>
          </CardHeader>
          <CardContent>
            <MeTokenHoldingCard holding={ownMeToken} showCreatorProfile={true} />
          </CardContent>
        </Card>
      )}

      {/* Other Holdings */}
      {otherHoldings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              MeToken Holdings
            </CardTitle>
            <CardDescription>MeTokens from other creators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {otherHoldings.map((holding) => (
                <MeTokenHoldingCard
                  key={holding.address}
                  holding={holding}
                  showCreatorProfile={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MeTokenHoldingCardProps {
  holding: MeTokenHolding;
  showCreatorProfile: boolean;
}

function MeTokenHoldingCard({ holding, showCreatorProfile }: MeTokenHoldingCardProps) {
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    } else {
      return num.toFixed(4);
    }
  };

  const formatTVL = (tvl: number) => {
    if (tvl >= 1000000) {
      return `$${(tvl / 1000000).toFixed(1)}M`;
    } else if (tvl >= 1000) {
      return `$${(tvl / 1000).toFixed(1)}K`;
    } else {
      return `$${tvl.toFixed(0)}`;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        {/* Creator Avatar */}
        {showCreatorProfile && (
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={holding.creatorProfile?.avatar_url ? convertFailingGateway(holding.creatorProfile.avatar_url) : undefined}
              alt={holding.creatorProfile?.username || 'Creator'}
            />
            <AvatarFallback>
              {holding.creatorProfile?.username?.charAt(0).toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{holding.name}</h3>
            <Badge variant="secondary">{holding.symbol}</Badge>
            {holding.isOwnMeToken && (
              <Badge variant="default" className="bg-primary">
                <Crown className="h-3 w-3 mr-1" />
                Yours
              </Badge>
            )}
          </div>

          {showCreatorProfile && holding.creatorProfile && (
            <p className="text-sm text-muted-foreground">
              by {holding.creatorProfile.username || 'Unknown Creator'}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>Balance: {formatBalance(holding.balance)}</span>
            <span>TVL: {formatTVL(holding.tvl)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/profile/${holding.ownerAddress}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </Link>
        </Button>
      </div>
    </div>
  );
}
