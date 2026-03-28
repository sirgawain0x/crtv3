# AA23 Error Debugging Guide

## Error Details
**Error Code:** AA23 (Account Abstraction - Validation Reverted)
**Location:** `wallet_prepareCalls` during swap execution
**Network:** Base Mainnet (Chain ID: 0x2105)

## Common Causes

### 1. Insufficient ETH for Gas
- **Problem:** Smart account doesn't have enough ETH to pay for transaction gas
- **Solution:** Add ETH to your smart account address
- **Check:** Look at your account balance on BaseScan

### 2. Insufficient Token Balance
- **Problem:** Trying to swap more tokens than you have
- **Solution:** Reduce swap amount or add more tokens
- **Check:** Verify token balance matches or exceeds `fromAmount`

### 3. Smart Account Not Deployed
- **Problem:** Account hasn't been deployed on Base network
- **Solution:** Deploy account by sending a small ETH transaction first
- **Check:** Look up account address on BaseScan - should show contract code

### 4. Value Field Mismatch (ETH Swaps)
- **Problem:** When swapping FROM ETH, the `value` field must equal the swap amount
- **Solution:** Ensure `quoteData.value` matches the ETH amount being swapped

### 5. EIP-7702 Authorization Issues
- **Problem:** Authorization delegation might not be properly set up
- **Solution:** Ensure the smart account supports EIP-7702 or use standard UserOps

## Debugging Steps

### Step 1: Check Account Balance
```typescript
// Add this before swap execution
const ethBalance = await client.getBalance({ address });
console.log('ETH Balance:', ethBalance);

// Check if swapping FROM ETH
if (fromToken === 'ETH') {
  const swapAmount = BigInt(swapState.quote.data.value || '0x0');
  const hasEnough = ethBalance >= swapAmount;
  console.log('Has enough ETH:', hasEnough);
  console.log('Need:', swapAmount, 'Have:', ethBalance);
}
```

### Step 2: Verify Smart Account Deployment
```typescript
// Check if account is deployed (CORRECT METHOD)
const code = await client.transport.request({
  method: "eth_getCode",
  params: [address, "latest"],
}) as Hex;

const isDeployed = code && code !== '0x' && code !== '0x0';
console.log('Account deployed:', isDeployed, 'Code:', code);
```

### Step 3: Inspect Quote Data
```typescript
console.log('Quote Data Structure:', {
  sender: quoteData.sender,
  callData: quoteData.callData?.slice(0, 20) + '...',
  value: quoteData.value,
  callGasLimit: quoteData.callGasLimit,
  verificationGasLimit: quoteData.verificationGasLimit,
  preVerificationGas: quoteData.preVerificationGas,
});
```

### Step 4: Add Balance Pre-checks
```typescript
// Before executing swap
const fromTokenBalance = fromToken === 'ETH' 
  ? ethBalance 
  : await getTokenBalance(fromTokenAddress, address);

const fromAmount = BigInt(swapState.quote.data.value || quoteData.callData);
if (fromTokenBalance < fromAmount) {
  throw new Error(`Insufficient ${fromToken} balance`);
}
```

## Recommended Fixes

### Fix 1: Add Balance Validation
Add pre-swap checks in `AlchemySwapWidget.tsx`:

```typescript
const handleExecuteSwap = async () => {
  if (!address || !swapState.quote || !client) return;

  try {
    setSwapState(prev => ({ ...prev, isSwapping: true, error: null }));

    // PRE-FLIGHT CHECKS
    const ethBalance = await client.getBalance({ address });
    
    // Check if account is deployed (using correct method)
    const code = await client.transport.request({
      method: "eth_getCode",
      params: [address, "latest"],
    }) as Hex;
    
    if (!code || code === '0x' || code === '0x0') {
      throw new Error('Smart account not deployed. Please fund your account with ETH first.');
    }

    // Check minimum ETH for gas (0.001 ETH minimum)
    const minGasEth = parseEther('0.001');
    if (ethBalance < minGasEth) {
      throw new Error(`Insufficient ETH for gas fees. Need at least 0.001 ETH, have ${formatEther(ethBalance)} ETH`);
    }

    // If swapping FROM ETH, check total needed
    if (swapState.fromToken === 'ETH') {
      const swapAmount = BigInt(swapState.quote.data.value || '0x0');
      const totalNeeded = swapAmount + minGasEth;
      if (ethBalance < totalNeeded) {
        throw new Error(
          `Insufficient ETH. Need ${formatEther(totalNeeded)} ETH total ` +
          `(${formatEther(swapAmount)} for swap + gas fees), ` +
          `but have ${formatEther(ethBalance)} ETH`
        );
      }
    }

    // ... rest of swap execution
  } catch (error) {
    // ... error handling
  }
};
```

### Fix 2: Use Paymaster for Gas Sponsorship
If you want to sponsor gas fees:

```typescript
// In swap-service.ts, ensure paymaster is configured
const quoteRequest: SwapQuoteRequest = {
  from,
  chainId: "0x2105",
  fromToken: BASE_TOKENS[fromToken],
  toToken: BASE_TOKENS[toToken],
  capabilities: {
    paymasterService: {
      policyId: process.env.NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID!,
    },
  },
  slippage: `0x${slippage.toString(16)}`,
};
```

### Fix 3: Better Error Messages
```typescript
} catch (error) {
  console.error('Swap execution failed:', error);
  
  let userMessage = 'Swap execution failed';
  const errorStr = error instanceof Error ? error.message : String(error);
  
  if (errorStr.includes('AA23')) {
    userMessage = 'Transaction validation failed. This usually means:\n' +
      '1. Insufficient ETH for gas fees\n' +
      '2. Insufficient token balance\n' +
      '3. Account not deployed on Base\n\n' +
      'Please check your balances and try again.';
  }
  
  setSwapState(prev => ({
    ...prev,
    error: userMessage,
    isSwapping: false,
  }));
}
```

## Testing Checklist

- [ ] Account has at least 0.001 ETH for gas
- [ ] Account is deployed (has contract code on BaseScan)
- [ ] Token balance >= swap amount
- [ ] Quote returns valid data structure
- [ ] Error messages are user-friendly
- [ ] Pre-flight checks catch issues before RPC call

## Additional Resources

- [EIP-4337 Error Codes](https://eips.ethereum.org/EIPS/eip-4337#error-codes)
- [Alchemy Account Kit Docs](https://accountkit.alchemy.com/)
- [Base Network Explorer](https://basescan.org/)
