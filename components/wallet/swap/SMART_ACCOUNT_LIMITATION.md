# Smart Account Swap Limitation

## Issue

**Alchemy's swap API currently does not support Account Kit smart account signatures.**

### Technical Details

- **Alchemy Swaps** expect standard ECDSA signatures (~132 characters, format: `0x[r][s][v]`)
- **Account Kit Smart Accounts** produce user operation signatures (~770+ characters, ERC-4337 format)
- The smart account owner signer is **not accessible from client-side code** for security reasons
- All signing operations go through the smart account abstraction layer

### Error You'll See

```
Swap requires EOA signature but received smart account signature.
Alchemy swaps are currently not supported with Account Kit smart accounts.
Please use a regular EOA wallet (MetaMask, WalletConnect, etc.) for swaps.
```

## Solutions

### Option 1: Use EOA Wallets for Swaps (Recommended Short-term)

The swap UI will work perfectly with:
- ✅ MetaMask
- ✅ WalletConnect
- ✅ Coinbase Wallet  
- ✅ Rainbow Wallet
- ✅ Any EOA wallet

**Implementation:**
- Detect wallet type before showing swap UI
- Show message for smart account users to connect an EOA wallet
- Guide users to use EOA wallets specifically for swaps

### Option 2: Use Alternative DEX Aggregators

Some DEX aggregators support smart accounts:

#### **1inch API**
- Supports ERC-4337 smart accounts
- Has good documentation for smart account integration
- Similar pricing and routes as Alchemy

#### **0x API**
- Supports smart account swaps
- Good liquidity aggregation
- REST API similar to Alchemy

#### **Uniswap Universal Router**
- Direct smart contract calls
- Can work with smart accounts via sendUserOperation
- Requires more integration work

### Option 3: Wait for Alchemy Support

Alchemy is actively working on ERC-4337 support. Monitor:
- [Alchemy Documentation](https://docs.alchemy.com/)
- Account Kit releases
- ERC-4337 compatibility updates

### Option 4: Implement Direct DEX Integration

Instead of using a swap aggregator API, integrate directly with DEXes:

```typescript
// Example: Uniswap V3 with smart account
const { 
  sendUserOperation,
  waitForUserOperationTransaction 
} = await client;

// Build swap transaction
const swapTx = await uniswapRouter.encodeSwapExactTokensForTokens(...);

// Send as user operation
const userOpHash = await sendUserOperation({
  uo: {
    target: UNISWAP_ROUTER_ADDRESS,
    data: swapTx,
    value: 0n,
  },
});

// Wait for confirmation
const txHash = await waitForUserOperationTransaction({ hash: userOpHash });
```

## Recommended Implementation

### For Production

**Dual Wallet Support:**

```typescript
import { useAccount } from 'wagmi';
import { useSmartAccountClient } from '@account-kit/react';

function SwapWidget() {
  const { isConnected: isEOAConnected } = useAccount(); // wagmi for EOA
  const { client: smartClient } = useSmartAccountClient(); // Account Kit
  
  const isSmartAccount = !!smartClient && !isEOAConnected;
  
  if (isSmartAccount) {
    return (
      <Alert>
        <AlertDescription>
          Swaps require an EOA wallet. Please connect MetaMask or another EOA wallet to swap tokens.
          <Button onClick={showWalletOptions}>Connect EOA Wallet</Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  return <AlchemySwapWidget />;
}
```

### Alternative: Switch to 1inch

Replace Alchemy swap service with 1inch which supports smart accounts:

```typescript
// lib/sdk/oneinch/swap-service.ts
export async function requestSwapQuote(params: {
  from: Address;
  fromToken: Address;
  toToken: Address;
  amount: string;
}) {
  const response = await fetch(
    `https://api.1inch.dev/swap/v5.2/8453/quote?` +
    `src=${params.fromToken}&dst=${params.toToken}&amount=${params.amount}`
  );
  
  const quote = await response.json();
  
  // 1inch returns transaction data that works with smart accounts
  return quote;
}
```

## Testing Smart Account Detection

Add this helper to detect wallet type:

```typescript
export function isSmartAccountWallet(client: any): boolean {
  // Check for Account Kit smart account
  if (client?.account?.type === 'ModularAccountV2') {
    return true;
  }
  
  // Check signature length (smart accounts produce longer signatures)
  // This is a runtime check
  return false;
}

// Usage
if (isSmartAccountWallet(client)) {
  showEOAWalletConnectPrompt();
} else {
  showSwapInterface();
}
```

## Future-Proof Solution

Monitor these developments:

1. **ERC-4337 Standardization**
   - More APIs adding smart account support
   - Standard signature formats emerging

2. **Alchemy Updates**
   - Watch for Account Kit swap support announcements
   - Subscribe to Alchemy changelog

3. **Alternative Solutions**
   - Biconomy (has smart account swap support)
   - Safe Apps (built for smart accounts)
   - ZeroDev (ERC-4337 focused)

## Summary

| Solution | Effort | Works Now | Best For |
|----------|--------|-----------|----------|
| Use EOA wallets | Low | ✅ Yes | Quick fix |
| Switch to 1inch | Medium | ✅ Yes | Better UX |
| Direct DEX integration | High | ✅ Yes | Full control |
| Wait for Alchemy | None | ❌ No | Future |

**Recommendation**: Switch to 1inch API or implement wallet type detection and prompt EOA connection for swaps.
