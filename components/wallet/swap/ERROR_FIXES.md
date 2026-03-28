# Swap Component Error Fixes

## Issue: Multicall3 Call Failed Error

### Problem
Users were encountering "Multicall3: call failed" errors when trying to swap tokens, especially when using USD input mode with preset buttons ($10, $25, $50, $100).

### Root Causes
1. **Insufficient Balance**: Users trying to swap more than they have
2. **No Balance Validation**: USD input didn't check balance before requesting quote
3. **Poor Error Handling**: Errors weren't properly displayed to users
4. **No Max Balance Helper**: Users couldn't easily see or use their maximum balance

### Solutions Implemented

#### 1. Enhanced Balance Validation in USD Input
```typescript
// Before: No balance check
const tokenAmount = await priceService.convertFromUSD(parseFloat(value), token);
await handleFromAmountChange(tokenAmount.toFixed(6));

// After: Check balance first
const availableBalance = parseFloat(balances[swapState.fromToken]);
if (tokenAmount > availableBalance) {
  const maxUSD = await priceService.convertToUSD(availableBalance, token);
  setError(`Insufficient balance. You can swap up to ${formatUSD(maxUSD)}`);
  return;
}
```

#### 2. Added MAX Button
- Click "MAX" to use full available balance
- Works in both USD and Token modes
- Shows exact maximum swappable amount
- Disabled when wallet not connected

#### 3. Better Error Messages
**Before:**
```
Error: Multicall3: call failed
```

**After:**
```
Insufficient balance. You can swap up to $3.93 (0.001312 ETH)
```

#### 4. Added Balance Indicators
- Shows max USD amount below preset buttons
- Displays "Add funds" link when balance is zero
- Shows helpful link in error messages

#### 5. Improved Error State Handling
```typescript
try {
  setSwapState(prev => ({ ...prev, isLoading: true, error: null }));
  // ... conversion and validation
} catch (error) {
  setSwapState(prev => ({
    ...prev,
    isLoading: false,
    error: error instanceof Error ? error.message : 'Failed to convert'
  }));
}
```

### UI Changes

#### Added MAX Button
```
You Pay                    [MAX] [💲 USD ↔]
```

#### Preset Buttons with Max Indicator
```
[$10] [$25] [$50] [$100]
                    Max: ~$3.93
```

#### Error with Helpful Link
```
❌ Insufficient balance. You can swap up to $3.93 (0.001312 ETH)
   Add funds to your wallet →
```

#### Zero Balance Alert
```
ℹ️ You don't have any ETH to swap. Add funds to get started →
```

### Testing Checklist

- [x] Try to swap more than balance (should show clear error)
- [x] Click preset button with insufficient balance (should show max available)
- [x] Click MAX button (should populate with full balance)
- [x] MAX button in USD mode (should show USD equivalent)
- [x] MAX button in Token mode (should show token amount)
- [x] Zero balance state (should show helpful alert)
- [x] Error includes "Add funds" link
- [x] Loading states work correctly
- [x] Error clears when valid amount entered

### Error Scenarios & Handling

| Scenario | Old Behavior | New Behavior |
|----------|-------------|--------------|
| Insufficient balance | Generic Multicall3 error | "You can swap up to $X.XX" |
| Zero balance | Error on submit | Proactive alert with link |
| Invalid amount | Silent fail | Clear error message |
| Wallet not connected | Confusing error | "Please connect wallet" |
| Preset > balance | Request fails | Prevents request, shows max |

### Code Locations

**Main Changes:**
- `handleUSDInputChange()` - Added balance validation
- `handleMaxAmount()` - New function for MAX button
- Error display section - Added helpful links
- Preset buttons - Added max indicator

**Files Modified:**
- `components/wallet/swap/AlchemySwapWidget.tsx`

### Future Improvements

1. **Dynamic Preset Buttons**: Show presets based on available balance
   ```
   If balance = $3.93, show: [$1] [$2] [$3] [MAX]
   If balance = $250, show: [$50] [$100] [$150] [MAX]
   ```

2. **Gas Fee Warning**: Show if swap would leave no ETH for gas
   ```
   ⚠️ Warning: This will use your entire ETH balance. 
   You'll need ETH for future gas fees.
   ```

3. **Slippage Protection**: Add slippage settings for better price protection

4. **Retry Logic**: Auto-retry failed requests with backoff

5. **Balance Refresh**: Auto-refresh balance after each swap

### Developer Notes

**Important Considerations:**
1. Always validate balance BEFORE requesting quote
2. Show maximum available amount in error messages
3. Provide helpful links for funding
4. Handle errors at each conversion step
5. Clear loading states properly

**Common Edge Cases:**
- Very small balances (< $1)
- Very large USD inputs
- Network latency during conversion
- Price changes during quote request
- Account not deployed on Base

### Support Resources

- [Conversion Guide](./CONVERSION_GUIDE.md)
- [USD Input Improvements](./USD_INPUT_IMPROVEMENTS.md)
- [Swap README](./README.md)
