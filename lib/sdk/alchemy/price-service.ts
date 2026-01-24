import { type TokenSymbol } from './swap-service';
import { serverLogger } from '@/lib/utils/logger';

// Price data interface
export interface TokenPrice {
  symbol: TokenSymbol;
  price: number; // USD price
  lastUpdated: number; // timestamp
}

// Price cache to avoid excessive API calls
const priceCache = new Map<TokenSymbol, TokenPrice>();
const CACHE_DURATION = 60000; // 1 minute cache

export class PriceService {
  private static instance: PriceService;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static getInstance(apiKey?: string): PriceService {
    if (!PriceService.instance) {
      if (!apiKey) {
        throw new Error('API key required for first PriceService instantiation');
      }
      PriceService.instance = new PriceService(apiKey);
    }
    return PriceService.instance;
  }

  /**
   * Get current USD price for a token
   */
  async getTokenPrice(symbol: TokenSymbol): Promise<number> {
    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
      return cached.price;
    }

    try {
      const price = await this.fetchTokenPrice(symbol);

      // Update cache
      priceCache.set(symbol, {
        symbol,
        price,
        lastUpdated: Date.now(),
      });

      return price;
    } catch (error) {
      serverLogger.error(`Failed to fetch price for ${symbol}:`, error);

      // Return cached price if available, even if expired
      if (cached) {
        return cached.price;
      }

      // Fallback prices (approximate)
      const fallbackPrices: Record<TokenSymbol, number> = {
        ETH: 3000,
        USDC: 1,
        DAI: 1,
      };

      return fallbackPrices[symbol];
    }
  }

  /**
   * Fetch price from CoinGecko API
   */
  private async fetchTokenPrice(symbol: TokenSymbol): Promise<number> {
    const coinGeckoIds: Record<TokenSymbol, string> = {
      ETH: 'ethereum',
      USDC: 'usd-coin',
      DAI: 'dai',
    };

    const coinId = coinGeckoIds[symbol];
    if (!coinId) {
      throw new Error(`Unknown token symbol: ${symbol}`);
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data[coinId]?.usd || 0;
  }

  /**
   * Get prices for multiple tokens at once
   */
  async getTokenPrices(symbols: TokenSymbol[]): Promise<Record<TokenSymbol, number>> {
    const prices: Record<TokenSymbol, number> = {} as Record<TokenSymbol, number>;

    // Check cache for all tokens first
    const uncachedSymbols: TokenSymbol[] = [];

    for (const symbol of symbols) {
      const cached = priceCache.get(symbol);
      if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
        prices[symbol] = cached.price;
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // Fetch uncached prices
    if (uncachedSymbols.length > 0) {
      try {
        const coinGeckoIds: Record<TokenSymbol, string> = {
          ETH: 'ethereum',
          USDC: 'usd-coin',
          DAI: 'dai',
        };

        const coinIds = uncachedSymbols.map(symbol => coinGeckoIds[symbol]).join(',');

        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          for (const symbol of uncachedSymbols) {
            const coinId = coinGeckoIds[symbol];
            const price = data[coinId]?.usd || 0;

            prices[symbol] = price;

            // Update cache
            priceCache.set(symbol, {
              symbol,
              price,
              lastUpdated: Date.now(),
            });
          }
        } else {
          // Fallback to individual requests
          for (const symbol of uncachedSymbols) {
            prices[symbol] = await this.getTokenPrice(symbol);
          }
        }
      } catch (error) {
        serverLogger.error('Failed to fetch multiple prices:', error);

        // Fallback to individual requests
        for (const symbol of uncachedSymbols) {
          prices[symbol] = await this.getTokenPrice(symbol);
        }
      }
    }

    return prices;
  }

  /**
   * Convert token amount to USD value
   */
  async convertToUSD(amount: number, symbol: TokenSymbol): Promise<number> {
    const price = await this.getTokenPrice(symbol);
    return amount * price;
  }

  /**
   * Convert USD value to token amount
   */
  async convertFromUSD(usdAmount: number, symbol: TokenSymbol): Promise<number> {
    const price = await this.getTokenPrice(symbol);
    return usdAmount / price;
  }

  /**
   * Format USD value for display
   */
  static formatUSD(amount: number): string {
    if (amount < 0.01) {
      return '< $0.01';
    }
    if (amount < 1) {
      return `$${amount.toFixed(4)}`;
    }
    if (amount < 100) {
      return `$${amount.toFixed(2)}`;
    }
    if (amount < 1000) {
      return `$${amount.toFixed(2)}`;
    }
    if (amount < 1000000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${(amount / 1000000).toFixed(1)}M`;
  }

  /**
   * Format token amount with USD value
   */
  static formatTokenWithUSD(amount: number, symbol: TokenSymbol, usdValue: number): string {
    const formattedAmount = amount.toFixed(6).replace(/\.?0+$/, '');
    const formattedUSD = PriceService.formatUSD(usdValue);
    return `${formattedAmount} ${symbol} (${formattedUSD})`;
  }
}

// Export singleton instance
export const priceService = PriceService.getInstance(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
