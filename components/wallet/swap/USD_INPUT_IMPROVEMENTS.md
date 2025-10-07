# USD Input Improvements - Swap Component

## Overview
Enhanced the swap component to allow users to input amounts in USD, making it more intuitive and user-friendly for swapping cryptocurrencies.

## Key Features Added

### 1. **USD/Token Input Toggle**
- Users can now toggle between USD and token input modes
- Toggle button shows current mode with a green $ icon when in USD mode
- Seamlessly switches between input types without losing data

### 2. **Direct USD Input**
- Users can type in USD amounts directly (e.g., "$50")
- Automatic conversion to token amounts in real-time
- Shows token equivalent on the right side of the input

### 3. **Quick Preset Buttons**
- Four preset USD amounts: $10, $25, $50, $100
- One-click selection for common swap amounts
- Only visible when in USD input mode

### 4. **Real-time Conversions**
- Bidirectional conversion between USD ↔ Token
- Shows live exchange rates
- Updates automatically when prices change

### 5. **Enhanced UX**
- Clear labels: "You Pay" and "You Receive"
- Visual feedback with $ icon highlighting
- Inline conversion display for context

## Usage Examples

### Swap $50 worth of ETH for USDC
1. Click the USD/ETH toggle button (now shows "USD" in green)
2. Click the "$50" preset button OR type "50" in the input
3. Component automatically calculates how much ETH that is
4. Shows quote for conversion to USDC
5. Execute swap

### Switch Between Modes
1. In Token mode: Enter "0.01" ETH
2. Click toggle → switches to USD mode showing "$30.00"
3. Click toggle again → back to Token mode showing "0.01"

### Manual USD Entry
1. Ensure USD mode is active (green $ icon)
2. Type any USD amount (e.g., "75.50")
3. See token equivalent display on right
4. Quote updates automatically

## Technical Implementation

### New State Variables
```typescript
const [inputMode, setInputMode] = useState<'token' | 'usd'>('usd'); // Default to USD
const [usdInput, setUsdInput] = useState<string>('');
```

### New Handler Functions
```typescript
handleUSDInputChange() // Converts USD to token amount
handleInputModeToggle() // Switches between modes
handlePresetAmount() // Quick USD preset selection
```

### Conversion Flow
```
User enters USD → Convert to Token Amount → Request Quote → Show Results
     ↓                      ↓                    ↓              ↓
   $50.00    →      0.016666 ETH    →    Quote API   →   49.50 USDC
```

## UI Changes

### Before
```
From: [ETH] [0.0          ]
Balance: 0.001312 ETH
```

### After
```
You Pay                      [USD ↔]
[ETH] [$50.00              ≈ 0.016666 ETH]
Balance: 0.001312 ETH        @ $3,000
[$10] [$25] [$50] [$100]   ← Preset buttons
```

## Benefits

1. **User-Friendly**: Most users think in USD, not token amounts
2. **Faster Trading**: Preset buttons for quick swaps
3. **Better Understanding**: See both USD and token amounts simultaneously
4. **Flexible**: Toggle between modes based on preference
5. **Professional**: Matches UX of popular exchanges like Coinbase, 21.co

## Testing Checklist

- [ ] Toggle between USD and Token modes
- [ ] Enter USD amount manually
- [ ] Click preset buttons ($10, $25, $50, $100)
- [ ] Verify conversion accuracy
- [ ] Check balance validation still works
- [ ] Confirm quote updates correctly
- [ ] Test swap execution with USD input
- [ ] Verify mode persists during token selection
- [ ] Check responsive design on mobile
- [ ] Confirm error handling for invalid amounts

## Future Enhancements

### Possible Additions
1. **Custom Preset Amounts**: Let users set their own presets
2. **Percentage Buttons**: 25%, 50%, 75%, 100% of balance
3. **Min/Max Indicators**: Show minimum and maximum swap amounts
4. **Slippage Settings**: Advanced slippage tolerance controls
5. **Price Alerts**: Set alerts when exchange rate hits target
6. **Swap History**: Show recent swap transactions
7. **Multi-Currency Support**: EUR, GBP, etc.

### Optimization Ideas
1. Debounce USD input to reduce quote requests
2. Cache recent conversions
3. Preload prices for faster initial load
4. Add loading skeleton for price updates

## Code Location

- **Main Component**: `components/wallet/swap/AlchemySwapWidget.tsx`
- **Currency Utilities**: `lib/utils/currency-converter.ts`
- **Price Service**: `lib/sdk/alchemy/price-service.ts`
- **Swap Service**: `lib/sdk/alchemy/swap-service.ts`

## Related Documentation

- [Conversion Guide](./CONVERSION_GUIDE.md)
- [Swap README](./README.md)
- [Conversion Example Component](./ConversionExample.tsx)

## Developer Notes

### Important Considerations
1. Always validate USD input before conversion
2. Handle edge cases (very small amounts, very large amounts)
3. Ensure balance checks work in both modes
4. Maintain precision in conversions
5. Update USD value when token prices change

### Common Pitfalls
- Don't forget to clear both token AND USD inputs on error
- Remember to update mode indicator when toggling
- Keep preset buttons disabled during loading
- Sync USD input with token amount on mode switch

## Support

For questions or issues related to USD input functionality:
1. Check the [Conversion Guide](./CONVERSION_GUIDE.md)
2. Review the [ConversionExample](./ConversionExample.tsx) component
3. Verify price service is working correctly
4. Check browser console for conversion errors
