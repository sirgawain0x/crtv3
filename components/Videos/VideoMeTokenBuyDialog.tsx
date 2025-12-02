"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useMeTokensSupabase } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { formatEther, parseEther, encodeFunctionData } from 'viem';
import { useSmartAccountClient } from '@account-kit/react';
import { getDaiTokenContract } from '@/lib/contracts/DAIToken';
import { erc20Abi } from 'viem';
import { DaiFundingOptions } from '@/components/wallet/funding/DaiFundingOptions';
import { fetchVideoAssetByPlaybackId } from '@/lib/utils/video-assets-client';

interface VideoMeTokenBuyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playbackId: string;
  videoTitle?: string;
}

interface MeToken {
  id: string;
  address: string;
  name: string;
  symbol: string;
  owner_address: string;
}

export function VideoMeTokenBuyDialog({
  open,
  onOpenChange,
  playbackId,
  videoTitle,
}: VideoMeTokenBuyDialogProps) {
  const [meToken, setMeToken] = useState<MeToken | null>(null);
  const [videoAsset, setVideoAsset] = useState<{ id?: number; playback_id?: string } | null>(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [buyPreview, setBuyPreview] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [daiAllowance, setDaiAllowance] = useState<bigint>(BigInt(0));
  const [daiBalance, setDaiBalance] = useState<bigint>(BigInt(0));
  const [isLoadingMeToken, setIsLoadingMeToken] = useState(false);

  const { client } = useSmartAccountClient({});
  const {
    buyMeTokens,
    calculateMeTokensMinted,
    isPending,
    isConfirming,
    isConfirmed,
    transactionError,
  } = useMeTokensSupabase();

  // Fetch video asset and MeToken
  useEffect(() => {
    if (!open || !playbackId) return;

    const fetchMeToken = async () => {
      setIsLoadingMeToken(true);
      setError(null);
      try {
        // Fetch video asset to get creator_metoken_id
        const fetchedVideoAsset = await fetchVideoAssetByPlaybackId(playbackId);
        setVideoAsset(fetchedVideoAsset);
        
        if (!fetchedVideoAsset?.creator_metoken_id) {
          setError('This video does not have an associated MeToken.');
          setIsLoadingMeToken(false);
          return;
        }

        // Fetch MeToken by ID
        const response = await fetch(`/api/metokens/by-id/${fetchedVideoAsset.creator_metoken_id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch MeToken');
        }

        const result = await response.json();
        setMeToken(result.data);
      } catch (err) {
        console.error('Error fetching MeToken:', err);
        setError(err instanceof Error ? err.message : 'Failed to load MeToken information');
      } finally {
        setIsLoadingMeToken(false);
      }
    };

    fetchMeToken();
  }, [open, playbackId]);

  // Check DAI balance
  const checkDaiBalance = useCallback(async () => {
    if (!client) return;

    try {
      const daiContract = getDaiTokenContract('base');
      const balance = await client.readContract({
        address: daiContract.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [client.account?.address as `0x${string}`],
      }) as bigint;

      setDaiBalance(balance);
    } catch (err) {
      console.error('Failed to check DAI balance:', err);
      setDaiBalance(BigInt(0));
    }
  }, [client]);

  // Check DAI allowance
  const checkDaiAllowance = useCallback(async () => {
    if (!client || !meToken) return;

    try {
      const daiContract = getDaiTokenContract('base');
      const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
      const allowance = await client.readContract({
        address: daiContract.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [client.account?.address as `0x${string}`, diamondAddress as `0x${string}`],
      }) as bigint;

      setDaiAllowance(allowance);
    } catch (err) {
      console.error('Failed to check DAI allowance:', err);
      setDaiAllowance(BigInt(0));
    }
  }, [client, meToken]);

  // Refresh DAI balance and allowance when dialog opens
  useEffect(() => {
    if (open && client && meToken) {
      checkDaiBalance();
      checkDaiAllowance();
    }
  }, [open, client, meToken, checkDaiBalance, checkDaiAllowance]);

  // Calculate buy preview when amount changes
  useEffect(() => {
    const calculateBuyPreview = async () => {
      if (buyAmount && parseFloat(buyAmount) > 0 && meToken) {
        try {
          const preview = await calculateMeTokensMinted(meToken.address, buyAmount);
          setBuyPreview(preview);
        } catch (err) {
          console.error('Failed to calculate buy preview:', err);
        }
      } else {
        setBuyPreview('0');
      }
    };

    calculateBuyPreview();
  }, [buyAmount, calculateMeTokensMinted, meToken]);

  // Approve DAI
  const approveDai = async (amount: string) => {
    if (!client) throw new Error('Smart account client not initialized');

    const daiContract = getDaiTokenContract('base');
    const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
    const amountWei = parseEther(amount);

    // Send approval user operation
    const approveOperation = await client.sendUserOperation({
      uo: {
        target: daiContract.address as `0x${string}`,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [diamondAddress as `0x${string}`, amountWei],
        }),
        value: BigInt(0),
      },
    });

    // Wait for transaction confirmation
    await client.waitForUserOperationTransaction({
      hash: approveOperation.hash,
    });

    // Check allowance after confirmation
    await checkDaiAllowance();
  };

  const handleBuy = async () => {
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!meToken) {
      setError('MeToken information not available');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const buyAmountWei = parseEther(buyAmount);

      // Check if we need to approve DAI
      if (daiAllowance < buyAmountWei) {
        setSuccess('Approving DAI...');
        await approveDai(buyAmount);
        setSuccess('DAI approved! Proceeding with purchase...');
      }

      // Pass video tracking information when buying
      await buyMeTokens(meToken.address, buyAmount, {
        video_id: videoAsset?.id,
        playback_id: playbackId,
      });
      setSuccess('Buy order submitted successfully!');
      setBuyAmount('');
      
      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to buy MeTokens');
    }
  };

  const isLoading = isPending || isConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Buy {meToken?.symbol || 'MeTokens'}
            {videoTitle && (
              <span className="block text-sm font-normal text-muted-foreground mt-1">
                for {videoTitle}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Purchase MeTokens to support this creator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingMeToken ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading MeToken information...</span>
            </div>
          ) : error && !meToken ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : meToken ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="buyAmount">DAI Amount</Label>
                <Input
                  id="buyAmount"
                  type="number"
                  placeholder="0.00"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  disabled={isLoading}
                  min="0"
                  step="0.01"
                />
                {buyPreview && parseFloat(buyPreview) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You will receive approximately{' '}
                    <span className="font-medium">{parseFloat(buyPreview).toFixed(4)}</span>{' '}
                    {meToken.symbol}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {buyAmount && parseFloat(buyAmount) > 0 && daiBalance < parseEther(buyAmount) && (
                <DaiFundingOptions
                  requiredAmount={parseEther(buyAmount).toString()}
                  onBalanceUpdate={setDaiBalance}
                  className="mb-4"
                />
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleBuy}
                  disabled={
                    isLoading ||
                    !buyAmount ||
                    parseFloat(buyAmount) <= 0 ||
                    daiBalance < parseEther(buyAmount || '0')
                  }
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isPending ? 'Buying...' : isConfirming ? 'Confirming...' : 'Processing...'}
                    </>
                  ) : (
                    `Buy ${meToken.symbol}`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>MeToken:</strong> {meToken.name} ({meToken.symbol})
                </p>
                <p>
                  <strong>Your DAI Balance:</strong> {formatEther(daiBalance)} DAI
                </p>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
