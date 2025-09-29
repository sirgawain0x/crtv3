"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRightLeft, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useSmartAccountClient } from '@account-kit/react';
import { type Address, type Hex } from 'viem';
import { alchemySwapService, AlchemySwapService, type TokenSymbol } from '@/lib/sdk/alchemy/swap-service';

interface DaiSwapButtonProps {
  onSwapSuccess?: () => void;
  className?: string;
}

export function DaiSwapButton({ onSwapSuccess, className }: DaiSwapButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromToken, setFromToken] = useState<TokenSymbol>('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  const { address, client } = useSmartAccountClient({});

  const handleAmountChange = async (value: string) => {
    setFromAmount(value);
    setToAmount('');
    setQuote(null);
    setError(null);
    
    if (!value || parseFloat(value) <= 0 || !address) return;

    try {
      setIsLoading(true);
      
      const fromAmountHex = AlchemySwapService.formatAmount(value, fromToken);
      
      const quoteResponse = await alchemySwapService.requestSwapQuote({
        from: address as Address,
        fromToken,
        toToken: 'DAI',
        fromAmount: fromAmountHex,
      });

      if (quoteResponse.result?.quote) {
        const toAmount = AlchemySwapService.parseAmount(
          quoteResponse.result.quote.minimumToAmount,
          'DAI'
        );
        
        setToAmount(toAmount);
        setQuote(quoteResponse.result);
      }
    } catch (error) {
      console.error('Error getting quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to get quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!address || !quote || !client) return;

    try {
      setIsSwapping(true);
      setError(null);

      // Sign the quote using the smart wallet client
      const signInput = {
        type: quote.type,
        data: quote.data,
        signatureRequest: quote.signatureRequest,
      };

      // Use the Alchemy Swap Service for the swap functionality
      // The signPreparedCalls and sendPreparedCalls methods are not available on the React client
      const { alchemySwapService } = await import('@/lib/sdk/alchemy/swap-service');
      
      // Send the prepared calls using the swap service
      const sendResult = await alchemySwapService.sendPreparedCalls({
        type: quote.type,
        data: quote.data,
        chainId: "0x2105", // Base mainnet
        signature: quote.signatureRequest.data.raw,
      });

      if (sendResult.result.preparedCallIds.length === 0) {
        throw new Error('No prepared call IDs returned');
      }

      // Wait for transaction completion using the swap service
      const callStatusResult = await alchemySwapService.waitForCallCompletion(
        sendResult.result.preparedCallIds[0]!
      );

      if (!callStatusResult.result.receipts || callStatusResult.result.receipts.length === 0) {
        throw new Error('No transaction receipts found');
      }

      const txHash = callStatusResult.result.receipts[0].transactionHash;
      setTransactionHash(txHash);

      // Call success callback
      onSwapSuccess?.();

    } catch (err) {
      console.error('Swap execution failed:', err);
      setError(err instanceof Error ? err.message : 'Swap execution failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const canExecuteSwap = 
    fromAmount && 
    parseFloat(fromAmount) > 0 && 
    quote && 
    !isLoading && 
    !isSwapping;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Swap to DAI
        </CardTitle>
        <CardDescription>
          Convert your existing tokens to DAI using Alchemy&apos;s smart wallet integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {transactionHash && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              Swap completed successfully!
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://basescan.org/tx/${transactionHash}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View on BaseScan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* From Token Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">From</label>
          <div className="flex gap-2">
            <Select value={fromToken} onValueChange={(value) => {
              setFromToken(value as TokenSymbol);
              setFromAmount('');
              setToAmount('');
              setQuote(null);
              setError(null);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1"
              disabled={isLoading || isSwapping}
            />
          </div>
        </div>

        {/* To Amount Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium">To</label>
          <div className="flex gap-2">
            <div className="w-32 px-3 py-2 bg-muted rounded-md text-sm">
              DAI
            </div>
            <Input
              type="number"
              placeholder="0.0"
              value={toAmount}
              readOnly
              className="flex-1 bg-muted"
            />
          </div>
        </div>

        {/* Quote Information */}
        {quote && (
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="text-sm font-medium">Swap Quote</div>
            <div className="text-xs text-muted-foreground">
              Rate: 1 {fromToken} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} DAI
            </div>
            {quote.feePayment?.sponsored && (
              <div className="text-xs text-green-600">
                Gas sponsored by paymaster
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleSwap}
          disabled={!canExecuteSwap}
          className="w-full"
        >
          {isSwapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing Swap...
            </>
          ) : isLoading ? (
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

        <div className="text-xs text-muted-foreground">
          <p>Swap ETH or USDC to DAI on Base using Alchemy Smart Wallets</p>
          <p>Gas fees may be sponsored by paymaster</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default DaiSwapButton;
