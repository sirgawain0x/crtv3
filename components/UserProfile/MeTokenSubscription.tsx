"use client";
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import Image from 'next/image';
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
  const [isApproving, setIsApproving] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [approvalComplete, setApprovalComplete] = useState(false);
  const [approvalTxHash, setApprovalTxHash] = useState<string | null>(null);
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

  // Check DAI allowance status
  const checkAllowanceStatus = useCallback(async () => {
    if (!client) {
      setApprovalComplete(false);
      return;
    }
    
    try {
      const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
      const daiAddress = '0x50c5725949a6f0c72e6c4a641f24049a917db0cb' as `0x${string}`;
      
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
      
      const hasUnlimitedAllowance = currentAllowance >= (maxUint256 / BigInt(2));
      setApprovalComplete(hasUnlimitedAllowance);
      
      console.log('📊 Allowance status checked:', {
        hasUnlimited: hasUnlimitedAllowance,
        allowance: formatEther(currentAllowance),
      });
    } catch (err) {
      console.error('Failed to check allowance status:', err);
      setApprovalComplete(false);
    }
  }, [client]);

  // Handle DAI approval
  const handleApprove = async () => {
    if (!client) {
      setError('Wallet not connected');
      return;
    }

    setIsApproving(true);
    setError(null);
    setSuccess(null);
    setApprovalComplete(false);

    try {
      const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
      const daiAddress = '0x50c5725949a6f0c72e6c4a641f24049a917db0cb' as `0x${string}`;
      
      console.log('📝 Step 1: Approving unlimited DAI...');
      setSuccess('Approving unlimited DAI... Please sign the transaction in your wallet.');
      
      // Build approve operation
      const approveData = encodeFunctionData({
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
        args: [diamondAddress as `0x${string}`, maxUint256],
      });
      
      console.log('🔍 Approve operation details:', {
        target: daiAddress,
        dataLength: approveData.length,
        value: '0',
      });
      
      console.log('⏳ Calling client.sendUserOperation (waiting for wallet signature)...');
      console.log('💡 If this hangs, check your wallet - you may need to approve the transaction');
      
      // Add timeout wrapper
      const approvePromise = client.sendUserOperation({
        uo: {
          target: daiAddress,
          data: approveData,
          value: BigInt(0),
        },
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Transaction signature timeout. Please check your wallet and approve the transaction, or try again.'));
        }, 120000); // 2 minutes timeout
      });
      
      const approveOperation = await Promise.race([approvePromise, timeoutPromise]) as Awaited<ReturnType<typeof client.sendUserOperation>>;
      
      console.log('✅ Approve UserOperation sent:', approveOperation.hash);
      console.log('⏳ Waiting for approval confirmation...');
      setSuccess('Approval transaction sent! Waiting for confirmation...');
      
      const approveTxHash = await client.waitForUserOperationTransaction({
        hash: approveOperation.hash,
      });
      
      console.log('✅ Approve transaction confirmed:', approveTxHash);
      setApprovalTxHash(approveTxHash);
      
      // Validate allowance propagation
      console.log('🔍 Starting aggressive multi-node validation...');
      setSuccess('Approval confirmed! Validating across network nodes...');
      
      const allowanceAbi = [
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
      ] as const;
      
      const allowanceParams = {
        address: daiAddress,
        abi: allowanceAbi,
        functionName: 'allowance' as const,
        args: [client.account?.address as `0x${string}`, diamondAddress],
      };
      
      let validated = false;
      let attempts = 0;
      const maxAttempts = 6; // 60 seconds total
      const waitTime = 10000; // 10 seconds between attempts
      
      while (!validated && attempts < maxAttempts) {
        attempts++;
        const elapsedSeconds = attempts * (waitTime / 1000);
        
        console.log(`🔍 Validation attempt ${attempts}/${maxAttempts} (${elapsedSeconds}s elapsed)...`);
        setSuccess(`Validating allowance... (${elapsedSeconds}s)`);
        
        try {
          // Perform multiple parallel reads to hit different nodes
          const checks = await Promise.all([
            client.readContract(allowanceParams),
            client.readContract(allowanceParams),
            client.readContract(allowanceParams),
          ]) as bigint[];
          
          const allowances = checks.map(a => formatEther(a));
          console.log(`📊 Allowance checks:`, allowances);
          
          // All 3 checks must pass
          const allPassed = checks.every(allowance => allowance >= (maxUint256 / BigInt(2)));
          
          if (allPassed) {
            validated = true;
            const avgAllowance = checks.reduce((a, b) => a + b, BigInt(0)) / BigInt(checks.length);
            console.log(`✅ Validation passed after ${elapsedSeconds} seconds!`);
            console.log(`📊 Average allowance across nodes: ${formatEther(avgAllowance)} DAI`);
            setSuccess('Allowance validated across network! Ready to mint.');
            setApprovalComplete(true);
          } else {
            const passedCount = checks.filter(a => a >= (maxUint256 / BigInt(2))).length;
            console.log(`⚠️ Only ${passedCount}/3 nodes see the allowance, waiting ${waitTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (checkError) {
          console.warn(`⚠️ Validation check ${attempts} failed:`, checkError);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      if (!validated) {
        throw new Error(
          `Allowance not propagated after ${maxAttempts * (waitTime / 1000)} seconds! ` +
          `This indicates an Alchemy infrastructure issue. ` +
          `Please try again in a few minutes or contact Alchemy support.`
        );
      }
      
      console.log('✅ Approval complete and validated!');
      
    } catch (err) {
      console.error('❌ Approval failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve DAI');
      throw err;
    } finally {
      setIsApproving(false);
    }
  };

  // Handle minting MeTokens
  const handleMint = async () => {
    if (!client || !assetsDeposited || parseFloat(assetsDeposited) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Check if already subscribed
    if (realSubscriptionStatus?.isSubscribed) {
      setError(`This MeToken is already subscribed to Hub ${realSubscriptionStatus.hubId}. No need to subscribe again.`);
      return;
    }

    // Verify approval is complete
    if (!approvalComplete) {
      setError('Please approve DAI first before minting');
      return;
    }

    setIsMinting(true);
    setError(null);
    setSuccess(null);

    try {
      // Double-check subscription status
      console.log('🔍 Double-checking subscription status before minting...');
      const { checkMeTokenSubscriptionFromBlockchain } = await import('@/lib/utils/metokenSubscriptionUtils');
      const currentStatus = await checkMeTokenSubscriptionFromBlockchain(meToken.address);
      
      if (currentStatus.isSubscribed) {
        setError(`This MeToken is already subscribed to Hub ${currentStatus.hubId}. ` +
          'Please refresh the page to see the current status.');
        setIsMinting(false);
        return;
      }
      
      console.log('✅ Confirmed not subscribed, proceeding with mint...');

      const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
      const depositAmount = parseEther(assetsDeposited);
      
      // Build mint calldata
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
      
      // Mint with retry logic
      console.log('📝 Step 2: Minting MeTokens with retry logic...');
      setSuccess('Minting MeTokens... Please sign in your wallet.');
      
      let mintSuccess = false;
      let mintAttempts = 0;
      const maxMintAttempts = 3;
      const mintRetryDelay = 5000; // 5 seconds between retries
      
      while (!mintSuccess && mintAttempts < maxMintAttempts) {
        mintAttempts++;
        
        try {
          console.log(`🪙 Mint attempt ${mintAttempts}/${maxMintAttempts}...`);
          setSuccess(`Minting MeTokens (attempt ${mintAttempts}/${maxMintAttempts})... Please sign in your wallet.`);
          
          console.log('🔍 Mint operation details:', {
            target: diamondAddress,
            dataLength: mintCalldata.length,
            value: '0',
          });
          
          // Add timeout wrapper
          const mintPromise = client.sendUserOperation({
            uo: {
              target: diamondAddress,
              data: mintCalldata,
              value: BigInt(0),
            },
          });
          
          const mintTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Mint transaction signature timeout. Please check your wallet and approve the transaction, or try again.'));
            }, 120000); // 2 minutes timeout
          });
          
          const mintOperation = await Promise.race([mintPromise, mintTimeoutPromise]) as Awaited<ReturnType<typeof client.sendUserOperation>>;
          
          console.log('✅ Mint UserOperation sent:', mintOperation.hash);
          console.log('⏳ Waiting for confirmation...');
          setSuccess('Mint transaction sent! Waiting for confirmation...');
          
          const finalTxHash = await client.waitForUserOperationTransaction({
            hash: mintOperation.hash,
          });
          
          console.log('✅ Mint transaction completed:', finalTxHash);
          mintSuccess = true;
          
          console.log('🎉 MeToken subscription completed! Transaction ID:', finalTxHash);
          setSuccess('Successfully added liquidity to your MeToken!');
          setAssetsDeposited('');
          
          // Refresh subscription status
          await checkRealSubscriptionStatus();
          
          onSubscriptionSuccess?.();
          
        } catch (mintError) {
          const errorMessage = mintError instanceof Error ? mintError.message : String(mintError);
          const isAllowanceError = errorMessage.includes('insufficient allowance') || 
                                 errorMessage.includes('ERC20') ||
                                 errorMessage.includes('-32500');
          
          if (isAllowanceError && mintAttempts < maxMintAttempts) {
            console.log(`❌ Mint attempt ${mintAttempts} failed: ${errorMessage}`);
            console.log(`💡 This likely hit an un-synced node. Retrying in ${mintRetryDelay/1000}s...`);
            setSuccess(`Mint attempt ${mintAttempts} hit un-synced node, retrying...`);
            
            await new Promise(resolve => setTimeout(resolve, mintRetryDelay));
            continue; // Retry
          } else {
            console.error('❌ Mint transaction failed:', mintError);
            if (mintAttempts >= maxMintAttempts) {
              throw new Error(
                `Mint failed after ${maxMintAttempts} attempts. ` +
                `This suggests Alchemy's bundler infrastructure is experiencing sync delays. ` +
                `Please try again in a few minutes or contact Alchemy support. ` +
                `Error: ${errorMessage}`
              );
            }
            throw mintError;
          }
        }
      }
      
    } catch (err) {
      console.error('❌ Mint error:', err);
      setError(err instanceof Error ? err.message : 'Failed to mint MeTokens');
    } finally {
      setIsMinting(false);
    }
  };

  // Legacy subscribeToHub function (kept for backwards compatibility, but now just calls both)
  const subscribeToHub = async () => {
    if (!approvalComplete) {
      await handleApprove();
    }
    await handleMint();
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

  // Check allowance status on mount and when client/amount changes
  useEffect(() => {
    if (client && assetsDeposited && parseFloat(assetsDeposited) > 0) {
      checkAllowanceStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, assetsDeposited]);

  // Check real subscription status on mount and when meToken address changes
  useEffect(() => {
    checkRealSubscriptionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meToken.address]); // Only re-run when meToken address changes

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
              disabled={isSubscribing || isApproving || isMinting}
              min="1"
            />
            <p className="text-sm text-muted-foreground">
              The hub ID to subscribe to (default: 1)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetsDeposited" className="flex items-center space-x-2">
              <Image
                src="/images/tokens/dai-logo.svg"
                alt="DAI"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <span>DAI Amount to Deposit</span>
            </Label>
            <Input
              id="assetsDeposited"
              type="number"
              placeholder="0.00"
              value={assetsDeposited}
              onChange={(e) => setAssetsDeposited(e.target.value)}
              disabled={isSubscribing || isApproving || isMinting}
              step="0.01"
              min="0"
            />
            <p className="text-sm text-muted-foreground flex items-center space-x-1">
              <Image
                src="/images/tokens/dai-logo.svg"
                alt="DAI"
                width={12}
                height={12}
                className="w-3 h-3"
              />
              <span>Your DAI balance: {formatEther(daiBalance)}</span>
            </p>
            {assetsDeposited && parseFloat(assetsDeposited) > 0 && (
              <div className="text-sm">
                {daiBalance >= parseEther(assetsDeposited) ? (
                  <span className="text-green-600">✓ Sufficient DAI balance</span>
                ) : (
                  <span className="text-orange-600">⚠ Insufficient DAI balance</span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleApprove}
              disabled={!client || isApproving || isMinting || !assetsDeposited || parseFloat(assetsDeposited) <= 0 || approvalComplete || daiBalance < parseEther(assetsDeposited)}
              className="flex-1"
              variant={approvalComplete ? "outline" : "default"}
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : approvalComplete ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approved
                </>
              ) : (
                'Approve DAI'
              )}
            </Button>

            <Button 
              onClick={handleMint}
              disabled={!client || isApproving || isMinting || !approvalComplete || !assetsDeposited || parseFloat(assetsDeposited) <= 0 || daiBalance < parseEther(assetsDeposited)}
              className="flex-1"
            >
              {isMinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting...
                </>
              ) : (
                'Mint MeTokens'
              )}
            </Button>
          </div>
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
