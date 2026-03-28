"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Hex } from 'viem';
import { CurrencyConverter } from '@/lib/utils/currency-converter';
import { priceService, PriceService } from '@/lib/sdk/alchemy/price-service';
import { AlchemySwapService, type TokenSymbol } from '@/lib/sdk/alchemy/swap-service';
import { logger } from '@/lib/utils/logger';


/**
 * Example component demonstrating hex ↔ USD conversions
 * This shows how to use the CurrencyConverter utility in different scenarios
 */
export function ConversionExample() {
  const [token, setToken] = useState<TokenSymbol>('ETH');
  const [hexInput, setHexInput] = useState<string>('0xde0b6b3a7640000'); // 1 ETH
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [usdValue, setUsdValue] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);

  // Convert hex to token and USD when inputs change
  useEffect(() => {
    const convert = async () => {
      try {
        // Get current price
        const currentPrice = await priceService.getTokenPrice(token);
        setPrice(currentPrice);

        // Convert hex to display format
        if (hexInput && hexInput.startsWith('0x')) {
          const display = await CurrencyConverter.hexToDisplay(
            hexInput as Hex,
            token,
            priceService
          );
          setTokenAmount(display.tokenAmount);
          setUsdValue(display.usdValue);
        }
      } catch (error) {
        logger.error('Conversion error:', error);
      }
    };

    convert();
  }, [hexInput, token]);

  const handleTokenAmountChange = async (value: string) => {
    setTokenAmount(value);
    if (value && parseFloat(value) > 0) {
      try {
        // Convert token amount to hex
        const hex = AlchemySwapService.formatAmount(value, token);
        setHexInput(hex);
        
        // Convert to USD
        const usd = await priceService.convertToUSD(parseFloat(value), token);
        setUsdValue(usd);
      } catch (error) {
        logger.error('Error converting token to hex:', error);
      }
    }
  };

  const handleUsdChange = async (value: string) => {
    if (value && parseFloat(value) > 0) {
      try {
        // Convert USD to hex
        const hex = await CurrencyConverter.usdToHex(
          parseFloat(value),
          token,
          priceService
        );
        setHexInput(hex);
        
        // Convert to token amount
        const amount = await priceService.convertFromUSD(parseFloat(value), token);
        setTokenAmount(amount.toFixed(6));
        setUsdValue(parseFloat(value));
      } catch (error) {
        logger.error('Error converting USD to hex:', error);
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Hex ↔ USD Conversion Example</CardTitle>
        <CardDescription>
          Demonstrates how to convert between hexadecimal, token amounts, and USD values
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Selection */}
        <div className="space-y-2">
          <Label>Token</Label>
          <Select value={token} onValueChange={(v) => setToken(v as TokenSymbol)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ETH">ETH</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="DAI">DAI</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Current price: {PriceService.formatUSD(price)}
          </p>
        </div>

        {/* Hexadecimal Input */}
        <div className="space-y-2">
          <Label>Hexadecimal (Wei)</Label>
          <Input
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="0x..."
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Raw hex value used in blockchain transactions
          </p>
        </div>

        {/* Token Amount Input */}
        <div className="space-y-2">
          <Label>Token Amount</Label>
          <Input
            type="number"
            value={tokenAmount}
            onChange={(e) => handleTokenAmountChange(e.target.value)}
            placeholder="0.0"
          />
          <p className="text-xs text-muted-foreground">
            Human-readable token amount
          </p>
        </div>

        {/* USD Input */}
        <div className="space-y-2">
          <Label>USD Value</Label>
          <Input
            type="number"
            value={usdValue > 0 ? usdValue.toFixed(2) : ''}
            onChange={(e) => handleUsdChange(e.target.value)}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            Equivalent value in US Dollars
          </p>
        </div>

        {/* Summary */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="text-sm font-medium">Conversion Summary</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Hex:</div>
            <div className="font-mono text-xs break-all">{hexInput}</div>
            
            <div className="text-muted-foreground">Token:</div>
            <div>{tokenAmount} {token}</div>
            
            <div className="text-muted-foreground">USD:</div>
            <div>{PriceService.formatUSD(usdValue)}</div>
            
            <div className="text-muted-foreground">Formatted:</div>
            <div>
              {tokenAmount && usdValue > 0
                ? CurrencyConverter.formatWithUSD(tokenAmount, token, usdValue)
                : '-'}
            </div>
          </div>
        </div>

        {/* Helper Info */}
        <div className="text-xs text-muted-foreground space-y-1 p-3 border rounded-lg">
          <p className="font-medium">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Hex values represent wei (smallest unit) for blockchain transactions</li>
            <li>Token amounts are human-readable (e.g., 1.5 ETH)</li>
            <li>USD values help users understand real-world cost</li>
            <li>All conversions happen in real-time using current prices</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
