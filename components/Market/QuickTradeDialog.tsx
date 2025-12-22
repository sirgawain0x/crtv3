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
import { Loader2, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { useMeTokensSupabase } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { formatEther, parseEther, encodeFunctionData } from 'viem';
import { useSmartAccountClient, useAuthModal, useUser } from '@account-kit/react';
import { getDaiTokenContract } from '@/lib/contracts/DAIToken';
import { erc20Abi } from 'viem';
import { DaiFundingOptions } from '@/components/wallet/funding/DaiFundingOptions';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { creatorProfileSupabaseService } from '@/lib/sdk/supabase/creator-profiles';
import { convertFailingGateway } from '@/lib/utils/image-gateway';
import { MarketToken } from '@/app/api/market/tokens/route';

interface QuickTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: MarketToken | null;
}

export function QuickTradeDialog({
  open,
  onOpenChange,
  token,
}: QuickTradeDialogProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [preview, setPreview] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [daiAllowance, setDaiAllowance] = useState<bigint>(BigInt(0));
  const [daiBalance, setDaiBalance] = useState<bigint>(BigInt(0));
  const [meTokenBalance, setMeTokenBalance] = useState<bigint>(BigInt(0));
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState<string | null>(null);

  const { toast } = useToast();
  const { client } = useSmartAccountClient({});
  const { openAuthModal } = useAuthModal();
  const user = useUser();
  
  const isConnected = !!user && !!client;
  const {
    buyMeTokens,
    sellMeTokens,
    calculateMeTokensMinted,
    calculateAssetsReturned,
    isPending,
    isConfirming,
    isConfirmed,
    transactionError,
  } = useMeTokensSupabase();

  // Fetch creator avatar
  useEffect(() => {
    if (token?.owner_address) {
      creatorProfileSupabaseService
        .getCreatorProfileByOwner(token.owner_address)
        .then((profile) => {
          if (profile?.avatar_url) {
            setCreatorAvatarUrl(profile.avatar_url);
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, [token]);

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
    if (!client || !token) return;

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
  }, [client, token]);

  // Check user's MeToken balance
  const checkMeTokenBalance = useCallback(async () => {
    if (!client || !token) return;

    try {
      const balance = await client.readContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [client.account?.address as `0x${string}`],
      }) as bigint;

      setMeTokenBalance(balance);
    } catch (err) {
      console.error('Failed to check MeToken balance:', err);
      setMeTokenBalance(BigInt(0));
    }
  }, [client, token]);

  // Refresh balances when dialog opens
  useEffect(() => {
    if (open && isConnected && client && token) {
      checkDaiBalance();
      checkDaiAllowance();
      checkMeTokenBalance();
    }
  }, [open, isConnected, client, token, checkDaiBalance, checkDaiAllowance, checkMeTokenBalance]);

  // Calculate preview when amount changes
  useEffect(() => {
    const calculatePreview = async () => {
      if (amount && parseFloat(amount) > 0 && token) {
        try {
          if (mode === 'buy') {
            const preview = await calculateMeTokensMinted(token.address, amount);
            setPreview(preview);
          } else {
            const preview = await calculateAssetsReturned(token.address, amount);
            setPreview(preview);
          }
        } catch (err) {
          console.error('Failed to calculate preview:', err);
          setPreview('0');
        }
      } else {
        setPreview('0');
      }
    };

    calculatePreview();
  }, [amount, mode, calculateMeTokensMinted, calculateAssetsReturned, token]);

  // Approve DAI
  const approveDai = async (amount: string) => {
    if (!client) throw new Error('Smart account client not initialized');

    const daiContract = getDaiTokenContract('base');
    const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
    const amountWei = parseEther(amount);

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

    await client.waitForUserOperationTransaction({
      hash: approveOperation.hash,
    });

    await checkDaiAllowance();
  };

  const handleBuy = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to make a purchase.",
        variant: "destructive",
      });
      onOpenChange(false);
      setTimeout(() => {
        openAuthModal();
      }, 100);
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!token) {
      setError('Token information not available');
      return;
    }

    if (!client) {
      setError('Wallet not connected. Please connect your wallet.');
      openAuthModal();
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const buyAmountWei = parseEther(amount);

      if (daiAllowance < buyAmountWei) {
        setSuccess('Approving DAI...');
        await approveDai(amount);
        setSuccess('DAI approved! Proceeding with purchase...');
      }

      await buyMeTokens(token.address, amount);
      setSuccess('Buy order submitted successfully!');
      setAmount('');

      toast({
        title: "Purchase Successful",
        description: `Successfully purchased ${parseFloat(preview).toFixed(4)} ${token.symbol}`,
      });

      await checkDaiBalance();
      await checkMeTokenBalance();

      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Error in handleBuy:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to buy tokens';
      setError(errorMessage);
      setSuccess(null);
      
      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSell = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to sell tokens.",
        variant: "destructive",
      });
      onOpenChange(false);
      setTimeout(() => {
        openAuthModal();
      }, 100);
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!token) {
      setError('Token information not available');
      return;
    }

    if (!client) {
      setError('Wallet not connected. Please connect your wallet.');
      openAuthModal();
      return;
    }

    const sellAmountWei = parseEther(amount);
    if (meTokenBalance < sellAmountWei) {
      setError(`Insufficient balance. You have ${formatEther(meTokenBalance)} ${token.symbol}`);
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await sellMeTokens(token.address, amount);
      setSuccess('Sell order submitted successfully!');
      setAmount('');

      toast({
        title: "Sale Successful",
        description: `Successfully sold ${amount} ${token.symbol} for ${parseFloat(preview).toFixed(4)} DAI`,
      });

      await checkDaiBalance();
      await checkMeTokenBalance();

      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Error in handleSell:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sell tokens';
      setError(errorMessage);
      setSuccess(null);
      
      toast({
        title: "Sale Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const isLoading = isPending || isConfirming;

  if (!token) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-12 w-12 border-2 border-primary/30 flex-shrink-0">
              <AvatarImage
                src={creatorAvatarUrl ? convertFailingGateway(creatorAvatarUrl) : undefined}
                alt={token.symbol}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {token.symbol.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                {mode === 'buy' ? 'Buy' : 'Sell'} {token.symbol}
              </DialogTitle>
              {token.type === 'content_coin' && token.video_title && (
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  for {token.video_title}
                </p>
              )}
            </div>
          </div>
          <DialogDescription>
            {mode === 'buy' 
              ? `Purchase ${token.symbol} tokens`
              : `Sell your ${token.symbol} tokens back to the pool`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={mode} onValueChange={(value) => {
            setMode(value as 'buy' | 'sell');
            setAmount('');
            setPreview('0');
            setError(null);
            setSuccess(null);
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="buy"
                className={mode === 'buy' ? 'data-[state=active]:bg-green-500 data-[state=active]:text-white' : ''}
              >
                Buy
              </TabsTrigger>
              <TabsTrigger 
                value="sell"
                className={mode === 'sell' ? 'data-[state=active]:bg-red-500 data-[state=active]:text-white' : ''}
              >
                Sell
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="amount">
              {mode === 'buy' ? 'DAI Amount' : `${token.symbol} Amount`}
            </Label>
            <div className="relative">
              {mode === 'buy' && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <Image
                    src="/images/tokens/dai-logo.svg"
                    alt="DAI"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
              )}
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading || !isConnected}
                min="0"
                step="0.01"
                className={mode === 'buy' ? 'pl-10' : ''}
              />
            </div>
            {preview && parseFloat(preview) > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">
                  You will receive approximately{' '}
                  <span className="font-medium text-foreground">{parseFloat(preview).toFixed(4)}</span>{' '}
                  <span className="font-medium">{mode === 'buy' ? token.symbol : 'DAI'}</span>
                </p>
              </div>
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

          {!isConnected && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Connect your wallet to {mode === 'buy' ? 'purchase' : 'sell'} tokens
              </AlertDescription>
            </Alert>
          )}

          {mode === 'buy' && amount && parseFloat(amount) > 0 && isConnected && daiBalance < parseEther(amount) && (
            <DaiFundingOptions
              requiredAmount={parseEther(amount).toString()}
              onBalanceUpdate={setDaiBalance}
              className="mb-4"
            />
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              <>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => {
                      openAuthModal();
                    }, 100);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  Connect Wallet to {mode === 'buy' ? 'Buy' : 'Sell'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={mode === 'buy' ? handleBuy : handleSell}
                  disabled={
                    isLoading ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    (mode === 'buy' && daiBalance < parseEther(amount || '0')) ||
                    (mode === 'sell' && meTokenBalance < parseEther(amount || '0'))
                  }
                  className={`flex-1 ${
                    mode === 'buy' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isPending 
                        ? (mode === 'buy' ? 'Buying...' : 'Selling...')
                        : isConfirming 
                          ? 'Confirming...' 
                          : 'Processing...'}
                    </>
                  ) : (
                    `${mode === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border text-xs">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border border-primary/20">
                <AvatarImage
                  src={creatorAvatarUrl ? convertFailingGateway(creatorAvatarUrl) : undefined}
                  alt={token.symbol}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {token.symbol.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{token.name}</p>
                <p className="text-muted-foreground">{token.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              {!isConnected ? (
                <span className="text-xs text-muted-foreground italic">
                  Connect wallet to view balance
                </span>
              ) : mode === 'buy' ? (
                <div className="flex items-center gap-1.5">
                  <Image
                    src="/images/tokens/dai-logo.svg"
                    alt="DAI"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{formatEther(daiBalance)}</strong> DAI
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{formatEther(meTokenBalance)}</strong> {token.symbol}
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

