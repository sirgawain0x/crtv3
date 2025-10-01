"use client";
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { formatEther, parseEther, encodeFunctionData } from 'viem';
import { useSmartAccountClient, useChain } from '@account-kit/react';
import { useMeTokensSupabase, MeTokenData } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { DaiFundingOptions } from '@/components/wallet/funding/DaiFundingOptions';

interface MeTokenSubscriptionProps {
  meToken: MeTokenData;
  onSubscriptionSuccess?: () => void;
}

export function MeTokenSubscription({ meToken, onSubscriptionSuccess }: MeTokenSubscriptionProps) {
  const [hubId, setHubId] = useState('1'); // Default hub ID
  const [assetsDeposited, setAssetsDeposited] = useState('');
  const [daiBalance, setDaiBalance] = useState<bigint>(BigInt(0));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [realSubscriptionStatus, setRealSubscriptionStatus] = useState<{
    isSubscribed: boolean;
    balancePooled: string;
    balanceLocked: string;
    hubId: string;
    totalLocked: string;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const { client } = useSmartAccountClient({});
  const { chain } = useChain();
  const { isPending, isConfirming, isConfirmed, transactionError } = useMeTokensSupabase();

  // Check DAI balance
  const checkDaiBalance = useCallback(async () => {
    if (!client) return;
    
    try {
      const daiContract = {
        address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb' as `0x${string}`, // DAI on Base
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          }
        ] as const,
      };
      
      const balance = await client.readContract({
        address: daiContract.address,
        abi: daiContract.abi,
        functionName: 'balanceOf',
        args: [client.account?.address as `0x${string}`],
      }) as bigint;
      
      setDaiBalance(balance);
    } catch (err) {
      console.error('Failed to check DAI balance:', err);
      setDaiBalance(BigInt(0));
    }
  }, [client]);

  // Subscribe MeToken to hub
  const subscribeToHub = async () => {
    if (!client || !assetsDeposited || parseFloat(assetsDeposited) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Check if already subscribed before attempting subscription
    if (realSubscriptionStatus?.isSubscribed) {
      setError(`This MeToken is already subscribed to Hub ${realSubscriptionStatus.hubId}. No need to subscribe again.`);
      return;
    }
    
    // If we have an error checking status but not subscribed, warn but continue
    if (realSubscriptionStatus?.error && !realSubscriptionStatus.isSubscribed) {
      console.warn('⚠️ Subscription status check failed, but proceeding with subscription attempt:', realSubscriptionStatus.error);
    }

    setIsSubscribing(true);
    setError(null);
    setSuccess(null);

    try {
      // Double-check subscription status before proceeding
      console.log('🔍 Double-checking subscription status before subscription...');
      const { checkMeTokenSubscriptionFromBlockchain } = await import('@/lib/utils/metokenSubscriptionUtils');
      const currentStatus = await checkMeTokenSubscriptionFromBlockchain(meToken.address);
      
      if (currentStatus.isSubscribed) {
        setError(`This MeToken is already subscribed to Hub ${currentStatus.hubId}. Please refresh the page to see the current status.`);
        setIsSubscribing(false);
        return;
      }
      
      console.log('✅ Confirmed not subscribed, proceeding with subscription...');

      const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
      
      // First, approve DAI for the Diamond contract
      const daiContract = {
        address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb' as `0x${string}`,
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "spender", "type": "address"},
              {"internalType": "uint256", "name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ] as const,
      };

      // Approve DAI
      setSuccess('Approving DAI...');
      const approveResult = await client.sendTransaction({
        chain,
        to: daiContract.address,
        data: encodeFunctionData({
          abi: daiContract.abi,
          functionName: 'approve',
          args: [diamondAddress as `0x${string}`, parseEther(assetsDeposited)],
        }),
        value: BigInt(0),
      });

      if (approveResult) {
        await client.waitForTransactionReceipt({ hash: approveResult });
        setSuccess('DAI approved! Subscribing to hub...');
      }

      // Subscribe to hub
      const subscribeResult = await client.sendTransaction({
        chain,
        to: diamondAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: [
            {
              "inputs": [
                {"internalType": "string", "name": "name", "type": "string"},
                {"internalType": "string", "name": "symbol", "type": "string"},
                {"internalType": "uint256", "name": "hubId", "type": "uint256"},
                {"internalType": "uint256", "name": "assetsDeposited", "type": "uint256"}
              ],
              "name": "subscribe",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ] as const,
          functionName: 'subscribe',
          args: [meToken.name, meToken.symbol, BigInt(hubId), parseEther(assetsDeposited)],
        }),
        value: BigInt(0),
      });

      if (subscribeResult) {
        await client.waitForTransactionReceipt({ hash: subscribeResult });
        setSuccess('Successfully subscribed to hub!');
        setAssetsDeposited('');
        
        // Refresh subscription status after successful subscription
        await checkRealSubscriptionStatus();
        
        onSubscriptionSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to hub');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Check real subscription status from blockchain
  const checkRealSubscriptionStatus = useCallback(async () => {
    if (!meToken.address) return;
    
    setIsCheckingStatus(true);
    try {
      console.log('🔍 Checking real subscription status for:', meToken.address);
      const { checkMeTokenSubscriptionFromBlockchain } = await import('@/lib/utils/metokenSubscriptionUtils');
      const status = await checkMeTokenSubscriptionFromBlockchain(meToken.address);
      
      console.log('✅ Real subscription status:', status);
      setRealSubscriptionStatus({
        isSubscribed: status.isSubscribed,
        balancePooled: status.balancePooled,
        balanceLocked: status.balanceLocked,
        hubId: status.hubId,
        totalLocked: status.totalLocked
      });
      
      // If already subscribed, show appropriate message
      if (status.isSubscribed) {
        setError(`This MeToken is already subscribed to Hub ${status.hubId}. No need to subscribe again.`);
      } else if (status.error) {
        // Show error message but don't prevent subscription attempt
        console.warn('⚠️ Subscription status check had issues:', status.error);
        setError(null); // Don't show error to user, just log it
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('❌ Failed to check real subscription status:', err);
      setRealSubscriptionStatus(null);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [meToken.address]);

  // Check DAI balance on mount
  useEffect(() => {
    checkDaiBalance();
  }, [checkDaiBalance]);

  // Check real subscription status on mount
  useEffect(() => {
    checkRealSubscriptionStatus();
  }, [checkRealSubscriptionStatus]);

  const isLoading = isPending || isConfirming || isSubscribing || isCheckingStatus;
  const hasEnoughDai = daiBalance >= parseEther(assetsDeposited || '0');

  // If already subscribed, show success state instead of subscription form
  if (realSubscriptionStatus?.isSubscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            MeToken Already Subscribed
          </CardTitle>
          <CardDescription>
            {meToken.name} ({meToken.symbol}) is already subscribed and ready for trading.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Hub ID:</span>
              <span className="ml-2 font-mono">Hub {realSubscriptionStatus.hubId}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2 text-green-600 font-medium">Subscribed</span>
            </div>
            <div>
              <span className="text-muted-foreground">Pooled:</span>
              <span className="ml-2 font-mono">{formatEther(BigInt(realSubscriptionStatus.balancePooled))} DAI</span>
            </div>
            <div>
              <span className="text-muted-foreground">Locked:</span>
              <span className="ml-2 font-mono">{formatEther(BigInt(realSubscriptionStatus.balanceLocked))} DAI</span>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>Your MeToken is subscribed and ready for trading. You can add more liquidity or trade your tokens.</p>
          </div>
          
          <Button 
            onClick={checkRealSubscriptionStatus}
            variant="outline"
            className="w-full"
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Status'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Subscribe {meToken.symbol} to Hub</span>
          {isConfirmed && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Subscribe your MeToken to a hub to enable trading and add liquidity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {transactionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Transaction failed: {transactionError.message}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hubId">Hub ID</Label>
            <Input
              id="hubId"
              type="number"
              placeholder="1"
              value={hubId}
              onChange={(e) => setHubId(e.target.value)}
              disabled={isLoading}
              min="1"
            />
            <p className="text-sm text-muted-foreground">
              The hub ID to subscribe to (default: 1)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetsDeposited">DAI Amount to Deposit</Label>
            <Input
              id="assetsDeposited"
              type="number"
              placeholder="0.00"
              value={assetsDeposited}
              onChange={(e) => setAssetsDeposited(e.target.value)}
              disabled={isLoading}
              step="0.01"
              min="0"
            />
            <p className="text-sm text-muted-foreground">
              Your DAI balance: {formatEther(daiBalance)} DAI
            </p>
            {assetsDeposited && parseFloat(assetsDeposited) > 0 && (
              <div className="text-sm">
                {hasEnoughDai ? (
                  <span className="text-green-600">✓ Sufficient DAI balance</span>
                ) : (
                  <span className="text-orange-600">⚠ Insufficient DAI balance</span>
                )}
              </div>
            )}
          </div>

          {!hasEnoughDai && assetsDeposited && parseFloat(assetsDeposited) > 0 && (
            <DaiFundingOptions
              requiredAmount={parseEther(assetsDeposited).toString()}
              onBalanceUpdate={setDaiBalance}
            />
          )}

          <Button 
            onClick={subscribeToHub}
            disabled={isLoading || !assetsDeposited || parseFloat(assetsDeposited) <= 0 || !hasEnoughDai}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSubscribing ? 'Subscribing...' : isPending ? 'Processing...' : isConfirming ? 'Confirming...' : 'Processing...'}
              </>
            ) : (
              `Subscribe to Hub ${hubId}`
            )}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Subscription Info:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>MeToken: {meToken.name} ({meToken.symbol})</li>
            <li>Current TVL: ${meToken.tvl.toFixed(2)}</li>
            <li>Status: {isCheckingStatus ? 'Checking...' : realSubscriptionStatus ? (realSubscriptionStatus.isSubscribed ? 'Subscribed' : 'Not Subscribed') : 'Unknown'}</li>
          </ul>
          <p className="text-xs">
            Note: Subscribing to a hub will lock your DAI and enable trading for your MeToken.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
