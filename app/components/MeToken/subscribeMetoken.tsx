'use client';
import { useState } from 'react';
import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { prepareContractCall } from 'thirdweb';
import {
  useSendTransaction,
  useReadContract,
  useActiveAccount,
} from 'thirdweb/react';
import {
  metokenDiamondOptimism,
  metokenDiamondBase,
} from '@app/lib/utils/contracts/metokenDiamondContract';
import { formatEther } from 'viem';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';

interface MeTokenInfo {
  owner: string;
  hubId: bigint;
  balancePooled: bigint;
  balanceLocked: bigint;
  startTime: bigint;
  endTime: bigint;
  targetHubId: bigint;
  migration: string;
  name?: string;
  symbol?: string;
}

interface SubscribeToMetokenProps {
  tokenName?: string;
  tokenSymbol?: string;
}

export function SubscribeToMetoken({
  tokenName,
  tokenSymbol,
}: SubscribeToMetokenProps) {
  const activeAccount = useActiveAccount();
  const { mutate: subscribeTransaction } = useSendTransaction();

  const { data: isOwner, isPending: isPendingOwner } = useReadContract({
    contract: metokenDiamondBase,
    method: 'isOwner',
    args: [activeAccount?.address],
  });

  const { data: meTokenAddress, isPending: isPendingMeTokenAddress } =
    useReadContract({
      contract: metokenDiamondBase,
      method: 'getOwnerMeToken',
      args: [activeAccount?.address],
    });

  const { data: meTokenInfo, isPending: isPendingMeTokenInfo } =
    useReadContract({
      contract: metokenDiamondBase,
      method: 'getMeTokenInfo',
      args: [meTokenAddress],
    }) as { data: MeTokenInfo | undefined; isPending: boolean };

  // Merge passed props with meTokenInfo
  const enrichedMeTokenInfo = meTokenInfo
    ? {
        ...meTokenInfo,
        name: tokenName,
        symbol: tokenSymbol,
      }
    : undefined;

  const handleSubscribe = async () => {
    if (!enrichedMeTokenInfo) return;

    try {
      const transaction = prepareContractCall({
        contract: metokenDiamondBase,
        method: 'subscribe',
        params: [
          enrichedMeTokenInfo.name,
          enrichedMeTokenInfo.symbol,
          enrichedMeTokenInfo.hubId,
          enrichedMeTokenInfo.balancePooled,
        ],
      });
      subscribeTransaction(transaction);
    } catch (error) {
      console.error('Error preparing subscription:', error);
    }
  };

  // Show loading state while checking ownership
  if (isPendingOwner) {
    return <div>Checking MeToken ownership...</div>;
  }

  // If user is not an owner, don't show the component
  if (!isOwner) {
    return null;
  }

  // Show loading state while fetching MeToken info
  if (isPendingMeTokenAddress || isPendingMeTokenInfo) {
    return <div>Loading MeToken information...</div>;
  }

  if (!meTokenInfo) {
    return <div>No MeToken found for this address</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your MeToken Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Owner</p>
            <p className="font-mono text-sm">{meTokenInfo.owner}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Hub ID</p>
            <p className="text-sm">{meTokenInfo.hubId.toString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Balance Pooled
            </p>
            <p className="text-sm">
              {formatEther(meTokenInfo.balancePooled)} ETH
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Balance Locked
            </p>
            <p className="text-sm">
              {formatEther(meTokenInfo.balanceLocked)} ETH
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Start Time
            </p>
            <p className="text-sm">
              {new Date(Number(meTokenInfo.startTime) * 1000).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              End Time
            </p>
            <p className="text-sm">
              {new Date(Number(meTokenInfo.endTime) * 1000).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Target Hub ID
            </p>
            <p className="text-sm">{meTokenInfo.targetHubId.toString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Migration Address
            </p>
            <p className="font-mono text-sm">{meTokenInfo.migration}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
