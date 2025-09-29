"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRightLeft, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useSmartAccountClient } from '@account-kit/react';
import { type Hex, type Address } from 'viem';
import { alchemySwapService, AlchemySwapService, type TokenSymbol, BASE_TOKENS, TOKEN_INFO } from '@/lib/sdk/alchemy/swap-service';

interface AlchemySwapWidgetProps {
  onSwapSuccess?: () => void;
  className?: string;
}

interface SwapState {
  fromToken: TokenSymbol;
  toToken: TokenSymbol;
  fromAmount: string;
  toAmount: string;
  isLoading: boolean;
  isSwapping: boolean;
  error: string | null;
  quote: any;
  transactionHash: string | null;
}

export function AlchemySwapWidget({ onSwapSuccess, className }: AlchemySwapWidgetProps) {
  const { address, client } = useSmartAccountClient({});
  
  const [swapState, setSwapState] = useState<SwapState>({
    fromToken: 'ETH',
    toToken: 'USDC',
    fromAmount: '',
    toAmount: '',
    isLoading: false,
    isSwapping: false,
    error: null,
    quote: null,
    transactionHash: null,
  });

  const [balances, setBalances] = useState<Record<TokenSymbol, string>>({
    ETH: '0',
    USDC: '0',
    DAI: '0',
  });

  // Fetch token balances
  useEffect(() => {
    if (!address || !client) return;

    const fetchBalances = async () => {
      try {
        // Get ETH balance
        const ethBalance = await client.getBalance({
          address: address as Address,
        });
        
        const newBalances: Record<TokenSymbol, string> = {
          ETH: AlchemySwapService.parseAmount(`0x${ethBalance.toString(16)}` as Hex, 'ETH'),
          USDC: '0', // TODO: Fetch ERC20 balances
          DAI: '0',  // TODO: Fetch ERC20 balances
        };

        setBalances(newBalances);
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
  }, [address, client]);

  const handleFromTokenChange = (value: string) => {
    const newFromToken = value as TokenSymbol;
    setSwapState(prev => ({
      ...prev,
      fromToken: newFromToken,
      toToken: prev.fromToken, // Swap the tokens
      fromAmount: '',
      toAmount: '',
      quote: null,
      error: null,
    }));
  };

  const handleToTokenChange = (value: string) => {
    const newToToken = value as TokenSymbol;
    setSwapState(prev => ({
      ...prev,
      toToken: newToToken,
      fromAmount: '',
      toAmount: '',
      quote: null,
      error: null,
    }));
  };

  const handleFromAmountChange = async (value: string) => {
    setSwapState(prev => ({ ...prev, fromAmount: value, toAmount: '', quote: null, error: null }));
    
    if (!value || parseFloat(value) <= 0 || !address) return;

    try {
      setSwapState(prev => ({ ...prev, isLoading: true }));
      
      const fromAmountHex = AlchemySwapService.formatAmount(value, swapState.fromToken);
      
      const quoteResponse = await alchemySwapService.requestSwapQuote({
        from: address as Address,
        fromToken: swapState.fromToken,
        toToken: swapState.toToken,
        fromAmount: fromAmountHex,
      });

      if (quoteResponse.result?.quote) {
        const toAmount = AlchemySwapService.parseAmount(
          quoteResponse.result.quote.minimumToAmount,
          swapState.toToken
        );
        
        setSwapState(prev => ({
          ...prev,
          toAmount,
          quote: quoteResponse.result,
        }));
      }
    } catch (error) {
      console.error('Error getting quote:', error);
      setSwapState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get quote',
      }));
    } finally {
      setSwapState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSwapTokens = () => {
    setSwapState(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount,
      quote: null,
      error: null,
    }));
  };

  const handleExecuteSwap = async () => {
    if (!address || !swapState.quote || !client) return;

    try {
      setSwapState(prev => ({ ...prev, isSwapping: true, error: null }));

      // Sign the quote using the smart wallet client
      const signInput = {
        type: swapState.quote.type,
        data: swapState.quote.data,
        signatureRequest: swapState.quote.signatureRequest,
      };

      // TODO: Fix swap implementation - methods not available on current client
      // const signedCalls = await client.signPreparedCalls(signInput as any);
      // const sendResult = await client.sendPreparedCalls(signedCalls);
      
      // Temporary placeholder - replace with proper swap implementation
      throw new Error('Swap functionality temporarily disabled - needs implementation');

      // TODO: Restore this code once swap methods are properly implemented
      /*
      if (sendResult.preparedCallIds.length === 0) {
        throw new Error('No prepared call IDs returned');
      }

      // Wait for transaction completion
      const callStatusResult = await client.waitForCallsStatus({
        id: sendResult.preparedCallIds[0]!,
      });

      if (
        callStatusResult.status !== 'success' ||
        !callStatusResult.receipts ||
        !callStatusResult.receipts[0]
      ) {
        throw new Error(
          `Transaction failed with status ${callStatusResult.status}`
        );
      }

      const transactionHash = callStatusResult.receipts[0].transactionHash;
      
      setSwapState(prev => ({
        ...prev,
        transactionHash,
      }));
      */

      // Call success callback
      onSwapSuccess?.();

    } catch (error) {
      console.error('Swap execution failed:', error);
      setSwapState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Swap execution failed',
      }));
    } finally {
      setSwapState(prev => ({ ...prev, isSwapping: false }));
    }
  };

  const canExecuteSwap = 
    swapState.fromAmount && 
    parseFloat(swapState.fromAmount) > 0 && 
    swapState.quote && 
    !swapState.isLoading && 
    !swapState.isSwapping &&
    swapState.fromToken !== swapState.toToken;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Token Swap
        </CardTitle>
        <CardDescription>
          Swap tokens instantly using Alchemy&apos;s smart wallet integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {swapState.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{swapState.error}</AlertDescription>
          </Alert>
        )}

        {swapState.transactionHash && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              Swap completed successfully!
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://basescan.org/tx/${swapState.transactionHash}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View on BaseScan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* From Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">From</label>
          <div className="flex gap-2">
            <Select value={swapState.fromToken} onValueChange={handleFromTokenChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="DAI">DAI</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.0"
              value={swapState.fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              className="flex-1"
              disabled={swapState.isLoading || swapState.isSwapping}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Balance: {balances[swapState.fromToken]} {swapState.fromToken}
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapTokens}
            disabled={swapState.isLoading || swapState.isSwapping}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium">To</label>
          <div className="flex gap-2">
            <Select value={swapState.toToken} onValueChange={handleToTokenChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="DAI">DAI</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.0"
              value={swapState.toAmount}
              readOnly
              className="flex-1 bg-muted"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Balance: {balances[swapState.toToken]} {swapState.toToken}
          </div>
        </div>

        {/* Quote Information */}
        {swapState.quote && (
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="text-sm font-medium">Swap Quote</div>
            <div className="text-xs text-muted-foreground">
              Rate: 1 {swapState.fromToken} = {(parseFloat(swapState.toAmount) / parseFloat(swapState.fromAmount)).toFixed(6)} {swapState.toToken}
            </div>
            {swapState.quote.feePayment?.sponsored && (
              <div className="text-xs text-green-600">
                Gas sponsored by paymaster
              </div>
            )}
          </div>
        )}

        {/* Execute Swap Button */}
        <Button
          onClick={handleExecuteSwap}
          disabled={!canExecuteSwap}
          className="w-full"
        >
          {swapState.isSwapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing Swap...
            </>
          ) : swapState.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Quote...
            </>
          ) : (
            <>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Execute Swap
            </>
          )}
        </Button>

        {/* Supported Tokens Info */}
        <div className="text-xs text-muted-foreground">
          <p>Supported tokens on Base: ETH, USDC, DAI</p>
          <p>Swaps powered by Alchemy Smart Wallets</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AlchemySwapWidget;
