import { type Hex } from 'viem';
import { AlchemySwapService, type TokenSymbol, TOKEN_INFO } from '@/lib/sdk/alchemy/swap-service';
import { PriceService } from '@/lib/sdk/alchemy/price-service';

export class CurrencyConverter {
  /**
   * Convert hex amount to USD value
   */
  static async hexToUSD(
    hexAmount: Hex, 
    token: TokenSymbol, 
    priceService: PriceService
  ): Promise<number> {
    const tokenAmount = parseFloat(AlchemySwapService.parseAmount(hexAmount, token));
    return await priceService.convertToUSD(tokenAmount, token);
  }

  /**
   * Convert USD amount to hex
   */
  static async usdToHex(
    usdAmount: number,
    token: TokenSymbol,
    priceService: PriceService
  ): Promise<Hex> {
    const tokenAmount = await priceService.convertFromUSD(usdAmount, token);
    return AlchemySwapService.formatAmount(tokenAmount.toString(), token);
  }

  /**
   * Parse hex to human-readable amount with USD value
   */
  static async hexToDisplay(
    hexAmount: Hex,
    token: TokenSymbol,
    priceService: PriceService
  ): Promise<{
    tokenAmount: string;
    usdValue: number;
    formatted: string;
  }> {
    const tokenAmount = AlchemySwapService.parseAmount(hexAmount, token);
    const usdValue = await this.hexToUSD(hexAmount, token, priceService);
    const formatted = PriceService.formatTokenWithUSD(
      parseFloat(tokenAmount),
      token,
      usdValue
    );

    return {
      tokenAmount,
      usdValue,
      formatted,
    };
  }

  /**
   * Format token amount with USD equivalent
   */
  static formatWithUSD(
    amount: string | number,
    token: TokenSymbol,
    usdValue: number
  ): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return PriceService.formatTokenWithUSD(numAmount, token, usdValue);
  }

  /**
   * Get conversion rate between two tokens
   */
  static async getConversionRate(
    fromToken: TokenSymbol,
    toToken: TokenSymbol,
    priceService: PriceService
  ): Promise<number> {
    const prices = await priceService.getTokenPrices([fromToken, toToken]);
    return prices[fromToken] / prices[toToken];
  }

  /**
   * Validate and sanitize amount input
   */
  static sanitizeAmount(input: string, maxDecimals: number = 18): string {
    // Remove any non-numeric characters except decimal point
    let sanitized = input.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      sanitized = parts[0] + '.' + parts[1].substring(0, maxDecimals);
    }
    
    return sanitized;
  }

  /**
   * Format USD amount for display
   */
  static formatUSD(amount: number): string {
    return PriceService.formatUSD(amount);
  }

  /**
   * Convert between different token units (wei, gwei, ether)
   */
  static convertUnits(
    amount: string | bigint,
    from: 'wei' | 'gwei' | 'ether',
    to: 'wei' | 'gwei' | 'ether'
  ): string {
    const conversions = {
      wei: 1,
      gwei: 1e9,
      ether: 1e18,
    };

    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    const fromFactor = BigInt(conversions[from]);
    const toFactor = BigInt(conversions[to]);

    const result = (amountBigInt * toFactor) / fromFactor;
    return result.toString();
  }
}
