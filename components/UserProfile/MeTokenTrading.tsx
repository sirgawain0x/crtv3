"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMeTokensSupabase, MeTokenData } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { Loader2, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { formatEther, parseEther } from 'viem';

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
            </div>

            <Button 
              onClick={handleBuy}
              disabled={isLoading || !buyAmount || parseFloat(buyAmount) <= 0}
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
