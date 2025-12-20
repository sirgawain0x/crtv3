import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MeTokenData } from '@/lib/hooks/metokens/useMeTokens';
import { formatEther } from 'viem';
import { TrendingUp, Users, DollarSign, Clock, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface MeTokenInfoProps {
  meToken: MeTokenData;
}

export function MeTokenInfo({ meToken }: MeTokenInfoProps) {
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(label);
      toast({
        title: "Copied!",
        description: `${label} address copied to clipboard`,
      });
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again manually",
        variant: "destructive",
      });
    }
  };

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
            <p className="text-sm font-medium text-muted-foreground mb-1">Contract Address</p>
            <div className="flex items-center gap-2">
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                {formatAddress(meToken.address)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(meToken.address, 'Contract')}
              >
                {copiedAddress === 'Contract' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span className="sr-only">Copy address</span>
              </Button>
            </div>
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
            <p className="text-sm font-medium text-muted-foreground mb-1">Owner</p>
            <div className="flex items-center gap-2">
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                {formatAddress(meToken.info.owner)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(meToken.info.owner, 'Owner')}
              >
                {copiedAddress === 'Owner' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span className="sr-only">Copy address</span>
              </Button>
            </div>
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
                ${meToken.totalSupply > 0
                  ? (meToken.tvl / parseFloat(formatEther(meToken.totalSupply))).toFixed(4)
                  : '0.0000'
                }
              </p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium text-muted-foreground">Your Holdings Value</p>
            <p className="text-lg font-semibold text-green-600">
              ${meToken.totalSupply > 0
                ? (meToken.tvl * parseFloat(formatEther(meToken.balance)) / parseFloat(formatEther(meToken.totalSupply))).toFixed(2)
                : '0.00'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
