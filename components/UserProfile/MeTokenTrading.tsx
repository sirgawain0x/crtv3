"use client";
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMeTokensSupabase, MeTokenData } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { Loader2, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { formatEther, parseEther, encodeFunctionData } from 'viem';
import { useSmartAccountClient, useChain } from '@account-kit/react';
import { DAI_TOKEN_ADDRESSES, getDaiTokenContract } from '@/lib/contracts/DAIToken';
import { erc20Abi } from 'viem';
import { MeTokenSubscription } from './MeTokenSubscription';
import { DaiFundingOptions } from '@/components/wallet/funding/DaiFundingOptions';

interface MeTokenTradingProps {
  meToken: MeTokenData;
}

export function MeTokenTrading({ meToken }: MeTokenTradingProps) {
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buyPreview, setBuyPreview] = useState('0');
  const [sellPreview, setSellPreview] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [daiAllowance, setDaiAllowance] = useState<bigint>(BigInt(0));
  const [daiBalance, setDaiBalance] = useState<bigint>(BigInt(0));
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  const { client } = useSmartAccountClient({});
  const { chain } = useChain();
  const { 
    buyMeTokens, 
    sellMeTokens, 
    calculateMeTokensMinted, 
    calculateAssetsReturned,
    isPending,
    isConfirming,
    isConfirmed,
    transactionError
  } = useMeTokensSupabase();

  // Check if MeToken is subscribed
  const checkSubscriptionStatus = useCallback(async () => {
    if (!client) return;
    
    setIsCheckingSubscription(true);
    try {
      // A MeToken is considered subscribed if it has balancePooled > 0 or balanceLocked > 0
      // This indicates it has been subscribed to a hub
      const isSubscribed = meToken.balancePooled > BigInt(0) || meToken.balanceLocked > BigInt(0);
      setIsSubscribed(isSubscribed);
    } catch (err) {
      console.error('Failed to check subscription status:', err);
      setIsSubscribed(false);
    } finally {
      setIsCheckingSubscription(false);
    }
  }, [client, meToken.balancePooled, meToken.balanceLocked]);

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
    if (!client) return;
    
    try {
      const daiContract = getDaiTokenContract('base');
      const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5'; // Diamond contract address
      
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
  }, [client]);

  // Approve DAI for Diamond contract
  const approveDai = async (amount: string) => {
    if (!client) return;
    
    try {
      const daiContract = getDaiTokenContract('base');
      const diamondAddress = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
      
      const result = await client.sendTransaction({
        chain,
        to: daiContract.address as `0x${string}`,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [diamondAddress as `0x${string}`, parseEther(amount)],
        }),
        value: BigInt(0),
      });
      
      if (result) {
        await client.waitForTransactionReceipt({ hash: result });
        await checkDaiAllowance(); // Refresh allowance
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to approve DAI');
    }
  };

  // Check subscription status on mount
  useEffect(() => {
    checkSubscriptionStatus();
    checkDaiBalance();
    checkDaiAllowance();
  }, [meToken.address, checkSubscriptionStatus, checkDaiBalance, checkDaiAllowance]);

  // Calculate buy preview when amount changes
  useEffect(() => {
    const calculateBuyPreview = async () => {
      if (buyAmount && parseFloat(buyAmount) > 0) {
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
  }, [buyAmount, calculateMeTokensMinted, meToken.address]);

  // Calculate sell preview when amount changes
  useEffect(() => {
    const calculateSellPreview = async () => {
      if (sellAmount && parseFloat(sellAmount) > 0) {
        try {
          const preview = await calculateAssetsReturned(meToken.address, sellAmount);
          setSellPreview(preview);
        } catch (err) {
          console.error('Failed to calculate sell preview:', err);
        }
      } else {
        setSellPreview('0');
      }
    };

    calculateSellPreview();
  }, [sellAmount, calculateAssetsReturned, meToken.address]);

  const handleBuy = async () => {
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      setError('Please enter a valid amount');
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
      
      await buyMeTokens(meToken.address, buyAmount);
      setSuccess('Buy order submitted!');
      setBuyAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to buy MeTokens');
    }
  };

  const handleSell = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(sellAmount) > parseFloat(formatEther(meToken.balance))) {
      setError('Insufficient MeToken balance');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await sellMeTokens(meToken.address, sellAmount);
      setSuccess('Sell order submitted!');
      setSellAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell MeTokens');
    }
  };

  const isLoading = isPending || isConfirming;

  // Show loading state while checking subscription
  if (isCheckingSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Trade {meToken.symbol}</span>
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
          <CardDescription>Checking subscription status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show subscription component if MeToken is not subscribed
  if (isSubscribed === false) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Trade {meToken.symbol}</span>
              <Lock className="h-5 w-5 text-orange-500" />
            </CardTitle>
            <CardDescription>
              This MeToken is not subscribed to any hub yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Trading is not available for unsubscribed MeTokens. Please subscribe your MeToken to a hub first to enable trading.
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>MeToken Info:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Total Supply: {formatEther(meToken.totalSupply)} {meToken.symbol}</li>
                <li>TVL: ${meToken.tvl.toFixed(2)}</li>
                <li>Your Balance: {formatEther(meToken.balance)} {meToken.symbol}</li>
                <li>Status: Not Subscribed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <MeTokenSubscription 
          meToken={meToken} 
          onSubscriptionSuccess={() => {
            // Refresh subscription status after successful subscription
            checkSubscriptionStatus();
          }}
        />
      </div>
    );
  }

  // Show DAI funding options first if user has no DAI
  if (daiBalance === BigInt(0)) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Trade {meToken.symbol}</span>
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </CardTitle>
            <CardDescription>
              You need DAI to trade {meToken.name} tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Trading requires DAI. Please get DAI first to enable trading.
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>MeToken Info:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Total Supply: {formatEther(meToken.totalSupply)} {meToken.symbol}</li>
                <li>TVL: ${meToken.tvl.toFixed(2)}</li>
                <li>Your Balance: {formatEther(meToken.balance)} {meToken.symbol}</li>
                <li>Your DAI Balance: {formatEther(daiBalance)} DAI</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <DaiFundingOptions
          onBalanceUpdate={(newBalance) => {
            setDaiBalance(newBalance);
            // If user gets DAI, we'll automatically show the trading interface
          }}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Trade {meToken.symbol}</span>
          {isConfirmed && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Buy and sell {meToken.name} tokens. Your balance: {formatEther(meToken.balance)} {meToken.symbol}
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

        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyAmount">DAI Amount to Spend</Label>
              <Input
                id="buyAmount"
                type="number"
                placeholder="0.00"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                disabled={isLoading}
                step="0.01"
                min="0"
              />
              <p className="text-sm text-muted-foreground">
                You will receive approximately {buyPreview} {meToken.symbol} tokens
              </p>
              {buyAmount && parseFloat(buyAmount) > 0 && (
                <div className="text-sm space-y-1">
                  <div>
                    {daiBalance >= parseEther(buyAmount) ? (
                      <span className="text-green-600">✓ DAI balance sufficient</span>
                    ) : (
                      <span className="text-red-600">⚠ Insufficient DAI balance</span>
                    )}
                  </div>
                  <div>
                    {daiAllowance >= parseEther(buyAmount) ? (
                      <span className="text-green-600">✓ DAI allowance sufficient</span>
                    ) : (
                      <span className="text-orange-600">⚠ DAI approval required</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {buyAmount && parseFloat(buyAmount) > 0 && daiBalance < parseEther(buyAmount) && (
              <DaiFundingOptions
                requiredAmount={parseEther(buyAmount).toString()}
                onBalanceUpdate={setDaiBalance}
                className="mb-4"
              />
            )}

            <Button 
              onClick={handleBuy}
              disabled={isLoading || !buyAmount || parseFloat(buyAmount) <= 0 || daiBalance < parseEther(buyAmount || '0')}
              className="w-full"
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
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sellAmount">{meToken.symbol} Amount to Sell</Label>
              <Input
                id="sellAmount"
                type="number"
                placeholder="0.00"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                disabled={isLoading}
                step="0.01"
                min="0"
                max={formatEther(meToken.balance)}
              />
              <p className="text-sm text-muted-foreground">
                You will receive approximately {sellPreview} DAI
              </p>
            </div>

            <Button 
              onClick={handleSell}
              disabled={isLoading || !sellAmount || parseFloat(sellAmount) <= 0}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPending ? 'Selling...' : isConfirming ? 'Confirming...' : 'Processing...'}
                </>
              ) : (
                `Sell ${meToken.symbol}`
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>MeToken Info:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Total Supply: {formatEther(meToken.totalSupply)} {meToken.symbol}</li>
            <li>TVL: ${meToken.tvl.toFixed(2)}</li>
            <li>Your Balance: {formatEther(meToken.balance)} {meToken.symbol}</li>
          </ul>
          <p className="text-xs">
            Note: Selling MeTokens incurs a 20% stability fee to prevent pump-and-dump attacks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
