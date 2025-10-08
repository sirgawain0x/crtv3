"use client";
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { formatEther, parseEther, encodeFunctionData, maxUint256 } from 'viem';
import { useSmartAccountClient, useChain, useSendCalls } from '@account-kit/react';
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
    error?: string;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const { client } = useSmartAccountClient({});
  const { chain } = useChain();
  const { isPending, isConfirming, isConfirmed, transactionError } = useMeTokensSupabase();
  const { sendCallsAsync } = useSendCalls({ client });

  // Helper function to wait with countdown
  const waitWithCountdown = async (seconds: number) => {
    setCountdown(seconds);
    
    for (let i = seconds; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdown(null);
  };

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
      console.warn('⚠️ Subscription status check failed, but proceeding with subscription attempt:', 
        realSubscriptionStatus.error);
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
        setError(`This MeToken is already subscribed to Hub ${currentStatus.hubId}. ` +
          'Please refresh the page to see the current status.');
        setIsSubscribing(false);
        return;
      }
      
      console.log('✅ Confirmed not subscribed, proceeding with batch transaction...');

      const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
      const daiAddress = '0x50c5725949a6f0c72e6c4a641f24049a917db0cb' as `0x${string}`;
      const depositAmount = parseEther(assetsDeposited);
      
      // Check current allowance first
      setSuccess('Checking DAI allowance...');
      const currentAllowance = await client.readContract({
        address: daiAddress,
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "owner", "type": "address"},
              {"internalType": "address", "name": "spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          }
        ] as const,
        functionName: 'allowance',
        args: [client.account?.address as `0x${string}`, diamondAddress],
      }) as bigint;
      
      console.log('📊 Current DAI allowance:', {
        current: currentAllowance.toString(),
        currentFormatted: formatEther(currentAllowance) + ' DAI',
        required: depositAmount.toString(),
        requiredFormatted: formatEther(depositAmount) + ' DAI',
        hasEnough: currentAllowance >= depositAmount,
        smartAccount: client.account?.address,
        diamondSpender: diamondAddress
      });
      
      // Check if we need to approve more allowance
      // We approve max if current allowance is less than a very large threshold to ensure one-time setup
      const needsApproval = currentAllowance < (maxUint256 / BigInt(2)); // If not already near-max
      
      if (needsApproval) {
        console.log('🔓 Setting max DAI allowance for Diamond contract...');
        console.log('💡 Approving max uint256 to prevent any future allowance issues');
        console.log(`📊 Current allowance: ${formatEther(currentAllowance)} DAI, upgrading to unlimited`);
        setSuccess('Approving unlimited DAI (one-time setup)...');
      
      const approveOperation = await client.sendUserOperation({
        uo: {
          target: daiAddress,
          data: encodeFunctionData({
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
            functionName: 'approve',
            args: [diamondAddress as `0x${string}`, maxUint256], // Approve max to avoid any allowance issues
          }),
          value: BigInt(0),
        },
      });
      
      console.log('⏳ Waiting for approval confirmation...');
      const approveTxHash = await client.waitForUserOperationTransaction({ 
        hash: approveOperation.hash 
      });
      
      console.log('✅ DAI approval confirmed:', approveTxHash);
      setSuccess('Approval confirmed! Verifying allowance...');
      
      // Step 1.5: Verify the approval actually went through with retry logic
      console.log('🔍 Verifying DAI allowance after approval...');
      let verifiedAllowance = BigInt(0);
      let verifyAttempts = 0;
      const maxVerifyAttempts = 10;
      
      while (verifyAttempts < maxVerifyAttempts && verifiedAllowance < depositAmount) {
        // Wait progressively longer between attempts (3s, 4s, 5s, etc.)
        const waitTime = 3000 + (verifyAttempts * 1000);
        console.log(`⏳ Verification attempt ${verifyAttempts + 1}/${maxVerifyAttempts}, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        try {
          verifiedAllowance = await client.readContract({
            address: daiAddress,
            abi: [
              {
                "inputs": [
                  {"internalType": "address", "name": "owner", "type": "address"},
                  {"internalType": "address", "name": "spender", "type": "address"}
                ],
                "name": "allowance",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
              }
            ] as const,
            functionName: 'allowance',
            args: [client.account?.address as `0x${string}`, diamondAddress],
          }) as bigint;
          
          console.log(`📊 Verified allowance attempt ${verifyAttempts + 1}: ${verifiedAllowance.toString()} ` +
            `(need at least ${depositAmount.toString()})`);
          
          if (verifiedAllowance >= depositAmount) {
            console.log('✅ Allowance verified successfully! Approved amount:', verifiedAllowance.toString());
            break;
          }
        } catch (err) {
          console.warn(`⚠️ Allowance verification attempt ${verifyAttempts + 1} failed:`, err);
        }
        
        verifyAttempts++;
      }
      
      if (verifiedAllowance < depositAmount) {
        throw new Error(
          `Allowance verification failed after ${maxVerifyAttempts} attempts. ` +
          `Expected ${depositAmount.toString()} but got ${verifiedAllowance.toString()}. ` +
          `The approval transaction completed but the blockchain state hasn't propagated yet. ` +
          `Please try again in a few minutes.`
        );
      }
      
      setSuccess('Allowance verified! Waiting for network propagation...');
      
      // CRITICAL: Wait for blockchain state to propagate across all RPC nodes
      // Without this, gas estimation may hit a node that hasn't seen the approval yet
      console.log('⏳ Waiting 60 seconds for approval to propagate across all nodes...');
      console.log('⚠️ This is necessary due to Alchemy RPC load balancer inconsistencies');
      setSuccess('Waiting for network to sync (60 seconds)...');
      await waitWithCountdown(60);
      console.log('✅ Network propagation wait complete (60 seconds elapsed)');
      } else {
        console.log('✅ Max allowance already exists, skipping approval');
        console.log(`📊 Current allowance: ${formatEther(currentAllowance)} DAI (unlimited)`);
        setSuccess('Unlimited DAI allowance already set! Waiting for network sync...');
        
        // CRITICAL: Even though allowance exists, we still need to wait for network propagation
        // because different RPC nodes may not all see the allowance yet
        console.log('⏳ Waiting 60 seconds to ensure all RPC nodes are synced...');
        console.log('⚠️ This is necessary due to Alchemy RPC load balancer inconsistencies');
        setSuccess('Unlimited DAI allowance set! Waiting for network sync (60 seconds)...');
        await waitWithCountdown(60);
        console.log('✅ Network sync wait complete (60 seconds elapsed)');
        
        setSuccess('Network synced! Minting MeTokens...');
      }
      
      // Step 2: Verify allowance one more time right before minting
      console.log('🔍 Final allowance verification before minting...');
      setSuccess('Final verification before minting...');
      
      const finalAllowance = await client.readContract({
        address: daiAddress,
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "owner", "type": "address"},
              {"internalType": "address", "name": "spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          }
        ] as const,
        functionName: 'allowance',
        args: [client.account?.address as `0x${string}`, diamondAddress],
      }) as bigint;
      
      console.log('📊 Final allowance check:', {
        allowance: finalAllowance.toString(),
        allowanceFormatted: formatEther(finalAllowance) + ' DAI',
        isUnlimited: finalAllowance >= (maxUint256 / BigInt(2)),
        required: depositAmount.toString(),
      });
      
      if (finalAllowance < depositAmount) {
        throw new Error(
          `CRITICAL: After ${currentAllowance >= (maxUint256 / BigInt(2)) ? '60' : '120'} seconds, ` +
          `the allowance is STILL not synced across all RPC nodes. ` +
          `Current: ${formatEther(finalAllowance)} DAI, Need: ${formatEther(depositAmount)} DAI. ` +
          `This is an Alchemy infrastructure issue. Please wait 2-3 minutes and try again.`
        );
      }
      
      console.log('✅ Final allowance verified! Proceeding with mint...');
      
      // Step 3: Mint MeTokens
      console.log('🪙 Minting MeTokens with verified unlimited allowance...');
      setSuccess('Minting MeTokens...');
      
      // Build the mint calldata
      const mintCalldata = encodeFunctionData({
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "meToken", "type": "address"},
              {"internalType": "uint256", "name": "collateralAmount", "type": "uint256"},
              {"internalType": "address", "name": "depositor", "type": "address"}
            ],
            "name": "mint",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ] as const,
        functionName: 'mint',
        args: [meToken.address as `0x${string}`, depositAmount, client.account?.address as `0x${string}`],
      });
      
      console.log('📝 Mint transaction details:', {
        to: diamondAddress,
        from: client.account?.address,
        meToken: meToken.address,
        amount: depositAmount.toString(),
        depositor: client.account?.address,
      });
      
      const mintOperation = await client.sendUserOperation({
        uo: {
          target: diamondAddress,
          data: mintCalldata,
          value: BigInt(0),
        },
      });
      
      console.log('⏳ Waiting for mint confirmation...');
      const txHash = await client.waitForUserOperationTransaction({ 
        hash: mintOperation.hash 
      });
      
      console.log('✅ Batch transaction completed:', txHash);

      console.log('🎉 MeToken subscription completed! Transaction ID:', txHash);
      setSuccess('Successfully added liquidity to your MeToken!');
      setAssetsDeposited('');
      
      // Refresh subscription status after successful batch transaction
      await checkRealSubscriptionStatus();
      
      onSubscriptionSuccess?.();
    } catch (err) {
      console.error('❌ Subscription error:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        type: typeof err,
        smartAccount: client.account?.address,
        daiBalance: daiBalance.toString(),
        requestedAmount: assetsDeposited
      });
      
      // Handle different error types
      if (err instanceof Error) {
        // Check for abort errors
        if (err.message.includes('aborted') || err.message.includes('abort')) {
          setError('Transaction was cancelled. Please try again.');
        } else if (err.message.includes('rejected') || err.message.includes('denied')) {
          setError('Transaction was rejected. Please approve the transaction to continue.');
        } else if (err.message.includes('insufficient allowance')) {
          setError(`Blockchain sync issue: Network nodes haven't synced the approval yet. ` +
            `Please wait 30 seconds and try again. (Error: ${err.message.substring(0, 100)})`);
        } else if (err.message.includes('insufficient balance')) {
          setError(`Insufficient DAI balance in smart account ${client.account?.address?.substring(0, 10)}... ` +
            `You have ${formatEther(daiBalance)} DAI but need ${assetsDeposited} DAI.`);
        } else if (err.message.includes('insufficient')) {
          setError(`Transaction failed: ${err.message.substring(0, 150)}`);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to subscribe to hub. Please try again.');
      }
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

  // Check DAI balance on mount and when client changes
  useEffect(() => {
    checkDaiBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]); // Only re-run when client changes

  // Check real subscription status on mount and when meToken address changes
  useEffect(() => {
    checkRealSubscriptionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meToken.address]); // Only re-run when meToken address changes

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
            <AlertDescription>
              {success}
              {countdown !== null && (
                <span className="ml-2 font-bold text-lg">
                  {countdown}s
                </span>
              )}
            </AlertDescription>
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
            <li>Status: {isCheckingStatus ? 'Checking...' : 
              realSubscriptionStatus ? 
                (realSubscriptionStatus.isSubscribed ? 'Subscribed' : 'Not Subscribed') : 
                'Unknown'}</li>
          </ul>
          <p className="text-xs">
            Note: Subscribing to a hub will lock your DAI and enable trading for your MeToken.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
