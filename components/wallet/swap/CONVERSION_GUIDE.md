# Currency Conversion Guide

This guide explains how to use the hex-to-USD and USD-to-hex conversion utilities in the swap interface.

## Overview

The conversion system helps users understand token amounts in familiar USD terms by:
- Converting hexadecimal wei/token amounts to USD values
- Converting USD input back to token amounts
- Displaying real-time price information
- Providing formatted, human-readable outputs

## Components

### 1. CurrencyConverter (`lib/utils/currency-converter.ts`)

A utility class with static methods for currency conversions.

#### Basic Conversions

```typescript
import { CurrencyConverter } from '@/lib/utils/currency-converter';
import { priceService } from '@/lib/sdk/alchemy/price-service';

// Convert hex amount to USD
const hexAmount = '0x8ac7230489e80000' as Hex; // 10 ETH in wei
const usdValue = await CurrencyConverter.hexToUSD(hexAmount, 'ETH', priceService);
// Returns: 30000 (assuming ETH = $3000)

// Convert USD to hex
const usdAmount = 100; // $100
const hexValue = await CurrencyConverter.usdToHex(usdAmount, 'USDC', priceService);
// Returns: '0x5f5e100' (100 USDC with 6 decimals)
```

#### Display Formatting

```typescript
// Get human-readable display with USD value
const display = await CurrencyConverter.hexToDisplay(
  '0x8ac7230489e80000' as Hex,
  'ETH',
  priceService
);
// Returns: {
//   tokenAmount: "10.000000",
//   usdValue: 30000,
//   formatted: "10 ETH ($30.0K)"
// }

// Format USD amounts
const formatted = CurrencyConverter.formatUSD(1234.56);
// Returns: "$1.2K"
```

#### Conversion Rate

```typescript
// Get the conversion rate between two tokens
const rate = await CurrencyConverter.getConversionRate('ETH', 'USDC', priceService);
// Returns: 3000 (1 ETH = 3000 USDC)
```

#### Input Sanitization

```typescript
// Sanitize user input
const sanitized = CurrencyConverter.sanitizeAmount('123.456789012345678901234', 6);
// Returns: "123.456789" (limited to 6 decimals)
```

#### Unit Conversion

```typescript
// Convert between wei, gwei, and ether
const gwei = CurrencyConverter.convertUnits('1000000000', 'wei', 'gwei');
// Returns: "1"

const ether = CurrencyConverter.convertUnits('1000000000', 'gwei', 'ether');
// Returns: "1"
```

### 2. AlchemySwapWidget Updates

The swap widget now displays USD values in real-time:

- **Input fields**: Show USD equivalent next to token amounts
- **Balance display**: Show current token price
- **Quote information**: Detailed breakdown of what you pay/receive in USD

Example usage:
```typescript
// The widget automatically:
// 1. Fetches token prices every minute
// 2. Calculates USD values when amounts change
// 3. Displays prices and conversions in the UI
```

### 3. USDInputToggle Component (Optional)

A toggle input that lets users switch between token and USD input modes.

```typescript
import { USDInputToggle } from '@/components/wallet/swap/USDInputToggle';

<USDInputToggle
  token="ETH"
  value={amount}
  onChange={setAmount}
  disabled={isLoading}
  placeholder="0.0"
/>
```

**Features:**
- Toggle between token amount and USD input
- Automatic conversion on toggle
- Visual indicator ($ icon highlighted in USD mode)
- Synchronized with parent component

## Implementation Examples

### Example 1: Simple Token to USD Display

```typescript
const [amount, setAmount] = useState('1.5');
const [usdValue, setUsdValue] = useState(0);

useEffect(() => {
  const updateUSD = async () => {
    if (amount && parseFloat(amount) > 0) {
      const usd = await priceService.convertToUSD(parseFloat(amount), 'ETH');
      setUsdValue(usd);
    }
  };
  updateUSD();
}, [amount]);

// Display: 1.5 ETH (≈ $4,500)
```

### Example 2: Hex Transaction Amount to USD

```typescript
// User operation from blockchain
const userOp = {
  value: '0xde0b6b3a7640000' as Hex // 1 ETH
};

// Convert to USD for display
const display = await CurrencyConverter.hexToDisplay(
  userOp.value,
  'ETH',
  priceService
);

console.log(`Sending ${display.formatted}`);
// Output: "Sending 1 ETH ($3.0K)"
```

### Example 3: Accept USD Input, Send Hex

```typescript
// User enters: $50
const usdInput = 50;

// Convert to USDC hex amount
const hexAmount = await CurrencyConverter.usdToHex(
  usdInput,
  'USDC',
  priceService
);

// Use in transaction
const tx = await contract.transfer(recipient, hexAmount);
```

### Example 4: Batch Fetch Prices

```typescript
// Fetch multiple token prices at once
const prices = await priceService.getTokenPrices(['ETH', 'USDC', 'DAI']);

console.log(`ETH: ${PriceService.formatUSD(prices.ETH)}`);
console.log(`USDC: ${PriceService.formatUSD(prices.USDC)}`);
console.log(`DAI: ${PriceService.formatUSD(prices.DAI)}`);
```

## Price Service Details

The `PriceService` handles:

- **Price Fetching**: Gets real-time prices from CoinGecko API
- **Caching**: 1-minute cache to reduce API calls
- **Fallback**: Returns approximate prices if API fails
- **Multi-token**: Batch fetch for efficiency

Supported tokens:
- ETH (Ethereum)
- USDC (USD Coin)
- DAI (Dai Stablecoin)

## Best Practices

1. **Always handle async**: Price conversions are asynchronous
2. **Cache when possible**: Use the built-in price cache
3. **Validate inputs**: Use `sanitizeAmount` for user input
4. **Show loading states**: Conversions may take a moment
5. **Handle errors**: Network issues can affect price fetching
6. **Update regularly**: Prices change; refresh periodically

## Common Use Cases

### Use Case 1: Show Transaction Cost
```typescript
const gasCost = '0x123456' as Hex;
const { formatted } = await CurrencyConverter.hexToDisplay(gasCost, 'ETH', priceService);
// Display to user: "Gas: 0.000123 ETH ($0.37)"
```

### Use Case 2: Input Validation with USD Limit
```typescript
const maxUSD = 100;
const inputAmount = '0.5';

const usdValue = await priceService.convertToUSD(parseFloat(inputAmount), 'ETH');
if (usdValue > maxUSD) {
  alert(`Amount exceeds limit of ${CurrencyConverter.formatUSD(maxUSD)}`);
}
```

### Use Case 3: Balance Display
```typescript
const balance = await client.getBalance({ address });
const display = await CurrencyConverter.hexToDisplay(
  `0x${balance.toString(16)}` as Hex,
  'ETH',
  priceService
);
// Show: "Balance: 5.2 ETH ($15.6K)"
```

## Troubleshooting

### Prices not updating?
- Check network connection
- Verify CoinGecko API is accessible
- Clear price cache if stale

### Conversion returns 0?
- Ensure amount is properly formatted
- Check token symbol is supported
- Verify decimals are correct for token

### USD values seem wrong?
- Prices are cached for 1 minute
- Check if using fallback prices (logged in console)
- Verify CoinGecko API is responding correctly

## API Reference

See inline documentation in:
- `/lib/utils/currency-converter.ts`
- `/lib/sdk/alchemy/price-service.ts`
- `/lib/sdk/alchemy/swap-service.ts`
