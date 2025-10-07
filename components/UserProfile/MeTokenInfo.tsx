"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MeTokenData } from '@/lib/hooks/metokens/useMeTokens';
import { formatEther } from 'viem';
import { TrendingUp, Users, DollarSign, Clock } from 'lucide-react';

interface MeTokenInfoProps {
  meToken: MeTokenData;
}

export function MeTokenInfo({ meToken }: MeTokenInfoProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{meToken.name}</span>
            <Badge variant="secondary">${meToken.symbol}</Badge>
          </CardTitle>
          <CardDescription>
            Your personal token on the MeTokens protocol
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Supply</p>
              <p className="text-lg font-semibold">
                {formatEther(meToken.totalSupply)} {meToken.symbol}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Your Balance</p>
              <p className="text-lg font-semibold">
                {formatEther(meToken.balance)} {meToken.symbol}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Contract Address</p>
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {formatAddress(meToken.address)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Market Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Data
          </CardTitle>
          <CardDescription>
            Current market information for your MeToken
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">TVL</p>
              <p className="text-lg font-semibold text-green-600">
                ${meToken.tvl.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hub ID</p>
              <p className="text-lg font-semibold">
                #{meToken.info.hubId.toString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pooled Balance</p>
              <p className="text-sm">
                {formatEther(meToken.info.balancePooled)} DAI
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Locked Balance</p>
              <p className="text-sm">
                {formatEther(meToken.info.balanceLocked)} DAI
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Protocol Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Protocol Info
          </CardTitle>
          <CardDescription>
            MeTokens protocol configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Owner</p>
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {formatAddress(meToken.info.owner)}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Start Time</p>
            <p className="text-sm">
              {formatTimestamp(meToken.info.startTime)}
            </p>
          </div>

          {meToken.info.endTime > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">End Time</p>
              <p className="text-sm">
                {formatTimestamp(meToken.info.endTime)}
              </p>
            </div>
          )}

          {meToken.info.migration !== '0x0000000000000000000000000000000000000000' && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Migration</p>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {formatAddress(meToken.info.migration)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Statistics
          </CardTitle>
          <CardDescription>
            Key metrics for your MeToken
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Market Cap</p>
              <p className="text-lg font-semibold">
                ${meToken.tvl.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Price per Token</p>
              <p className="text-lg font-semibold">
                ${(meToken.tvl / parseFloat(formatEther(meToken.totalSupply))).toFixed(4)}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium text-muted-foreground">Your Holdings Value</p>
            <p className="text-lg font-semibold text-green-600">
              ${(meToken.tvl * parseFloat(formatEther(meToken.balance)) / parseFloat(formatEther(meToken.totalSupply))).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
