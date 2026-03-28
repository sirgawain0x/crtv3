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
import { METOKEN_ABI } from '@/lib/contracts/MeToken';
import { DaiFundingOptions } from '@/components/wallet/funding/DaiFundingOptions';
import { fetchVideoAssetByPlaybackId } from '@/lib/utils/video-assets-client';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { creatorProfileSupabaseService } from '@/lib/sdk/supabase/creator-profiles';
import { convertFailingGateway } from '@/lib/utils/image-gateway';
import { useVideoContribution } from '@/lib/hooks/metokens/useVideoContribution';
import { logger } from '@/lib/utils/logger';

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
  const [videoAsset, setVideoAsset] = useState<{ id?: number; playback_id?: string; attributes?: any; creator_metoken_id?: string } | null>(null);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [preview, setPreview] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // const [daiAllowance, setDaiAllowance] = useState<bigint>(BigInt(0)); // removed

  const [daiBalance, setDaiBalance] = useState<bigint>(BigInt(0));
  const [meTokenBalance, setMeTokenBalance] = useState<bigint>(BigInt(0));
  const [isLoadingMeToken, setIsLoadingMeToken] = useState(false);
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState<string | null>(null);
  // vaultAddress state removed


  // Fetch video contribution (earnings) with real-time updates
  // Poll every 5 seconds while dialog is open
  const { contribution, formattedContribution, isLoading: isLoadingContribution } = useVideoContribution({
    playbackId: playbackId || undefined,
    pollInterval: open ? 5000 : undefined, // Poll every 5 seconds when dialog is open
  });

  const { toast } = useToast();
  const { client } = useSmartAccountClient({});
  const { openAuthModal } = useAuthModal();
  const user = useUser();

  // Check if wallet is connected
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
    // getMeTokenVaultAddress, // not needed locally if we use ensureDaiApproval
  } = useMeTokensSupabase();

  // Fetch video asset and MeToken
  useEffect(() => {
    if (!open || !playbackId) return;

    const fetchMeToken = async () => {
      setIsLoadingMeToken(true);
      setError(null);
      try {
        // Fetch video asset to get token information
        const fetchedVideoAsset = await fetchVideoAssetByPlaybackId(playbackId);
        setVideoAsset(fetchedVideoAsset);

        if (!fetchedVideoAsset) {
          setError('Video asset not found.');
          setIsLoadingMeToken(false);
          return;
        }

        // Prioritize Content Coin over Creator MeToken
        const contentCoinId = fetchedVideoAsset?.attributes?.content_coin_id;
        const creatorMeTokenId = fetchedVideoAsset?.creator_metoken_id;

        let fetchUrl: string | null = null;

        // First, try to fetch Content Coin (video-specific token)
        if (contentCoinId) {
          if (contentCoinId.startsWith('0x')) {
            // It's an address - use the address endpoint
            fetchUrl = `/api/metokens/${contentCoinId}`;
          } else {
            // It's an ID - use the by-id endpoint
            fetchUrl = `/api/metokens/by-id/${contentCoinId}`;
          }
        } else if (creatorMeTokenId) {
          // Fallback to creator's MeToken if no Content Coin exists
          fetchUrl = `/api/metokens/by-id/${creatorMeTokenId}`;
        }

        if (!fetchUrl) {
          setError('This video does not have an associated MeToken or Content Coin.');
          setIsLoadingMeToken(false);
          return;
        }

        // Fetch MeToken/Content Coin
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch MeToken');
        }

        const result = await response.json();
        if (!result.data) {
          throw new Error('MeToken data not found in response');
        }
        const fetchedMeToken = result.data;
        setMeToken(fetchedMeToken);

        // Fetch creator profile to get avatar
        if (fetchedMeToken.owner_address) {
          try {
            const creatorProfile = await creatorProfileSupabaseService.getCreatorProfileByOwner(
              fetchedMeToken.owner_address
            );
            if (creatorProfile?.avatar_url) {
              setCreatorAvatarUrl(creatorProfile.avatar_url);
            }
          } catch (profileError) {
            logger.warn('Failed to fetch creator profile for avatar:', profileError);
            // Don't set error - avatar is optional
          }
        }
      } catch (err) {
        logger.error('Error fetching MeToken:', err);
        setError(err instanceof Error ? err.message : 'Failed to load MeToken information');
      } finally {
        setIsLoadingMeToken(false);
      }
    };

    fetchMeToken();
  }, [open, playbackId]);

  // Vault Address fetch effect removed


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
      logger.error('Failed to check DAI balance:', err);
      setDaiBalance(BigInt(0));
    }
  }, [client]);

  // Refresh DAI balance when dialog opens (only if connected)
  useEffect(() => {
    if (open && isConnected && client && meToken) {
      checkDaiBalance();
    }
  }, [open, isConnected, client, meToken, checkDaiBalance]);

  // Check user's MeToken balance
  const checkMeTokenBalance = useCallback(async () => {
    if (!client || !meToken) return;

    try {
      const balance = await client.readContract({
        address: meToken.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [client.account?.address as `0x${string}`],
      }) as bigint;

      setMeTokenBalance(balance);
    } catch (err) {
      logger.error('Failed to check MeToken balance:', err);
      setMeTokenBalance(BigInt(0));
    }
  }, [client, meToken]);

  // Refresh MeToken balance when dialog opens or mode changes (only if connected)
  useEffect(() => {
    if (open && isConnected && client && meToken) {
      checkMeTokenBalance();
    }
  }, [open, isConnected, client, meToken, checkMeTokenBalance, mode]);

  // Calculate preview when amount changes (only if connected and has amount)
  useEffect(() => {
    const calculatePreview = async () => {
      // Allow preview calculation even when not connected (for viewing purposes)
      if (amount && parseFloat(amount) > 0 && meToken) {
        try {
          if (mode === 'buy') {
            const preview = await calculateMeTokensMinted(meToken.address, amount);
            setPreview(preview);
          } else {
            const preview = await calculateAssetsReturned(meToken.address, amount);
            setPreview(preview);
          }
        } catch (err) {
          logger.error('Failed to calculate preview:', err);
          setPreview('0');
        }
      } else {
        setPreview('0');
      }
    };

    calculatePreview();
  }, [amount, mode, calculateMeTokensMinted, calculateAssetsReturned, meToken]);

  const handleBuy = async () => {
    logger.debug('🛒 Buy button clicked', { amount, meToken });

    // Check if wallet is connected first
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to make a purchase.",
        variant: "destructive",
      });
      // Close the buy dialog first to avoid modal layering issues
      onOpenChange(false);
      setTimeout(() => {
        openAuthModal();
      }, 100);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!meToken) {
      logger.error(' MeToken not available', { meToken });
      setError('MeToken information not available');
      toast({
        title: "Error",
        description: "MeToken information not available",
        variant: "destructive",
      });
      return;
    }

    if (!client) {
      logger.error(' Smart account client not initialized');
      setError('Wallet not connected. Please connect your wallet.');
      toast({
        title: "Error",
        description: "Wallet not connected. Please connect your wallet.",
        variant: "destructive",
      });
      openAuthModal();
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      logger.debug('💰 Starting purchase...', {
        meTokenAddress: meToken.address,
        amount,
        videoId: videoAsset?.id,
        playbackId
      });

      // const buyAmountWei = parseEther(amount); // removed unused var

      // Pass video tracking information when buying
      logger.debug('🔄 Calling buyMeTokens...');
      await buyMeTokens(meToken.address, amount, {
        video_id: videoAsset?.id,
        playback_id: playbackId,
      });
      logger.debug('✅ Buy order submitted successfully!');
      setSuccess('Buy order submitted successfully!');
      setAmount('');

      // Show success toast
      toast({
        title: "Purchase Successful",
        description: `Successfully purchased ${parseFloat(preview).toFixed(4)} ${meToken.symbol}`,
      });

      // Refresh balances
      await checkDaiBalance();
      await checkMeTokenBalance();

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      logger.error(' Error in handleBuy:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to buy MeTokens';
      setError(errorMessage);
      setSuccess(null);

      // Show error toast
      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSell = async () => {
    logger.debug('💸 Sell button clicked', { amount, meToken, meTokenBalance });

    // Check if wallet is connected first
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to sell tokens.",
        variant: "destructive",
      });
      // Close the buy dialog first to avoid modal layering issues
      onOpenChange(false);
      setTimeout(() => {
        openAuthModal();
      }, 100);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!meToken) {
      logger.error(' MeToken not available', { meToken });
      setError('MeToken information not available');
      toast({
        title: "Error",
        description: "MeToken information not available",
        variant: "destructive",
      });
      return;
    }

    if (!client) {
      logger.error(' Smart account client not initialized');
      setError('Wallet not connected. Please connect your wallet.');
      toast({
        title: "Error",
        description: "Wallet not connected. Please connect your wallet.",
        variant: "destructive",
      });
      openAuthModal();
      return;
    }

    const sellAmountWei = parseEther(amount);
    if (meTokenBalance < sellAmountWei) {
      setError(`Insufficient balance. You have ${formatEther(meTokenBalance)} ${meToken.symbol}`);
      toast({
        title: "Insufficient Balance",
        description: `You have ${formatEther(meTokenBalance)} ${meToken.symbol}`,
        variant: "destructive",
      });
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      logger.debug('💸 Starting sale...', {
        meTokenAddress: meToken.address,
        amount,
        meTokenBalance: meTokenBalance.toString(),
        videoId: videoAsset?.id,
        playbackId
      });

      // Pass video tracking information when selling
      logger.debug('🔄 Calling sellMeTokens...');
      await sellMeTokens(meToken.address, amount);
      logger.debug('✅ Sell order submitted successfully!');
      setSuccess('Sell order submitted successfully!');
      setAmount('');

      // Show success toast
      toast({
        title: "Sale Successful",
        description: `Successfully sold ${amount} ${meToken.symbol} for ${parseFloat(preview).toFixed(4)} DAI`,
      });

      // Refresh balances
      await checkDaiBalance();
      await checkMeTokenBalance();

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      logger.error(' Error in handleSell:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sell MeTokens';
      setError(errorMessage);
      setSuccess(null);

      // Show error toast
      toast({
        title: "Sale Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const isLoading = isPending || isConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {meToken && (
              <Avatar className="h-12 w-12 border-2 border-primary/30 flex-shrink-0">
                <AvatarImage
                  src={creatorAvatarUrl ? convertFailingGateway(creatorAvatarUrl) : undefined}
                  alt={meToken.symbol}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {meToken.symbol.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                {mode === 'buy' ? 'Buy' : 'Sell'} {meToken?.symbol || 'MeTokens'}
              </DialogTitle>
              {videoTitle && (
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  for {videoTitle}
                </p>
              )}
            </div>
          </div>
          <DialogDescription>
            {mode === 'buy'
              ? 'Purchase MeTokens to support this creator'
              : 'Sell your MeTokens back to the pool'}
          </DialogDescription>
          {/* Video Earnings Display */}
          {videoAsset?.id && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Video Earnings</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {isLoadingContribution ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    formattedContribution || '$0.00'
                  )}
                </p>
              </div>
            </div>
          )}
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

              {/* Token Display Section */}
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3 flex-1">
                  {mode === 'buy' ? (
                    <>
                      <div className="relative h-12 w-12 rounded-full overflow-hidden bg-white border-2 border-primary/20 flex-shrink-0">
                        <Image
                          src="/images/tokens/dai-logo.svg"
                          alt="DAI"
                          width={48}
                          height={48}
                          className="object-contain p-1"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">DAI</p>
                        <p className="text-xs text-muted-foreground">Dai Stablecoin</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-12 w-12 border-2 border-primary/20 flex-shrink-0">
                        <AvatarImage
                          src={creatorAvatarUrl ? convertFailingGateway(creatorAvatarUrl) : undefined}
                          alt={meToken.name}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {meToken.symbol.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{meToken.symbol}</p>
                        <p className="text-xs text-muted-foreground">{meToken.name}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {mode === 'buy' ? 'You pay' : 'You sell'}
                  </p>
                  <p className="text-lg font-semibold">
                    {mode === 'buy' ? 'DAI' : meToken.symbol}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  {mode === 'buy' ? 'DAI Amount' : `${meToken.symbol} Amount`}
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
                  {mode === 'sell' && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={creatorAvatarUrl ? convertFailingGateway(creatorAvatarUrl) : undefined}
                          alt={meToken.symbol}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {meToken.symbol.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
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
                    className={mode === 'buy' || mode === 'sell' ? 'pl-10' : ''}
                  />
                </div>
                {preview && parseFloat(preview) > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 flex-1">
                      {mode === 'buy' ? (
                        <>
                          <Avatar className="h-6 w-6 border border-primary/20">
                            <AvatarImage
                              src={creatorAvatarUrl ? convertFailingGateway(creatorAvatarUrl) : undefined}
                              alt={meToken.symbol}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {meToken.symbol.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm text-muted-foreground">
                            You will receive approximately{' '}
                            <span className="font-medium text-foreground">{parseFloat(preview).toFixed(4)}</span>{' '}
                            <span className="font-medium">{meToken.symbol}</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="relative h-6 w-6 rounded-full overflow-hidden bg-white border border-primary/20 flex-shrink-0">
                            <Image
                              src="/images/tokens/dai-logo.svg"
                              alt="DAI"
                              width={24}
                              height={24}
                              className="object-contain p-0.5"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            You will receive approximately{' '}
                            <span className="font-medium text-foreground">{parseFloat(preview).toFixed(4)}</span>{' '}
                            <span className="font-medium">DAI</span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="break-words">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {/* Connect Wallet Info Message */}
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
                        // Close the buy dialog first to avoid modal layering issues
                        onOpenChange(false);
                        // Small delay to ensure dialog closes before opening auth modal
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
                      className={`flex-1 ${mode === 'buy'
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
                        `${mode === 'buy' ? 'Buy' : 'Sell'} ${meToken.symbol}`
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
                      alt={meToken.symbol}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {meToken.symbol.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{meToken.name}</p>
                    <p className="text-muted-foreground">{meToken.symbol}</p>
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
                      <strong className="text-foreground">{formatEther(meTokenBalance)}</strong> {meToken.symbol}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
