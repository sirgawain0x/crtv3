# X402 Payment Architecture Migration

## Overview
This document explains the migration from server-side x402 payment handling to the correct client-side implementation.

## Problem Statement

### Original Architecture (Incorrect ❌)
The original implementation attempted to handle x402 payments through a server-side API route at:
```
app/api/x402/pay-for-ai-thumbnail/route.ts
```

**Why This Was Wrong:**
1. **No Wallet Access**: Server-side routes cannot access the user's wallet or private keys
2. **Security Risk**: Attempting to handle private keys server-side would be a major security vulnerability
3. **Protocol Requirements**: x402-fetch requires direct access to the wallet to sign payment transactions
4. **Simulation Only**: The implementation was only simulating payments, not actually executing them

### Correct Architecture (Implemented ✅)
X402 payments now use a client-side hook that integrates with the user's connected smart account:
```
lib/hooks/payments/useX402Payment.ts
```

**Why This Is Correct:**
1. **Direct Wallet Access**: Client-side code can access the connected wallet through Account Kit
2. **Secure Signing**: Transaction signing happens in the user's browser/wallet
3. **Protocol Compliance**: Properly implements x402-fetch's requirements
4. **Real Payments**: Actually executes payments using the user's smart account

## Implementation Details

### Client-Side Hook: `useX402Payment`

The hook provides:
- **makePayment()**: Execute x402 payments using the user's smart account
- **checkBalance()**: Verify sufficient USDC balance before payment
- **isProcessing**: Payment processing state
- **isConnected**: Wallet connection status
- **config**: x402 configuration (USDC on Base)

```typescript
const { makePayment, isProcessing, isConnected } = useX402Payment();

// Make a payment
const result = await makePayment({
  service: 'ai-thumbnail-generation',
  amount: '1000000', // 1 USDC
  endpoint: 'https://x402.payai.network/api/base/paid-content',
});
```

### Integration with Account Kit

The hook uses Account Kit's `useSmartAccountClient` to access the user's smart account:

```typescript
const { client } = useSmartAccountClient({ type: 'MultiOwnerModularAccount' });

// Wrap fetch with x402 payment capability
const fetchWithPayment = wrapFetchWithPayment(fetch, client.account, {
  chain: base,
  token: USDC_TOKEN_ADDRESSES.base,
});
```

### Payment Configuration

```typescript
const X402_CONFIG = {
  chain: base,
  token: {
    address: USDC_TOKEN_ADDRESSES.base,
    symbol: 'USDC',
    decimals: 6,
  },
  defaultAmount: '1000000', // 1 USDC
};
```

## Usage Example: CreateThumbnailForm

### Before (Incorrect)
```typescript
const makeX402Payment = async () => {
  // Called server-side API route
  const response = await fetch('/api/x402/pay-for-ai-thumbnail', {
    method: 'POST',
    body: JSON.stringify({ service: 'ai-thumbnail-generation' }),
  });
  return response.json();
};
```

### After (Correct)
```typescript
const { makePayment, isConnected } = useX402Payment();

const makeX402PaymentWithWallet = async () => {
  if (!isConnected) {
    throw new Error('Please connect your wallet to make payments');
  }

  const result = await makePayment({
    service: 'ai-thumbnail-generation',
    amount: '1000000',
    endpoint: 'https://x402.payai.network/api/base/paid-content',
  });

  return result;
};
```

## Security Considerations

### ✅ What We Do Right
1. **No Private Keys Server-Side**: Private keys never leave the user's browser/wallet
2. **User Authorization**: User must explicitly approve each payment transaction
3. **Client-Side Signing**: Transaction signing happens in the secure context of the wallet
4. **Connection Check**: Verify wallet connection before attempting payments

### ⚠️ Important Notes
1. **Wallet Connection Required**: Users must connect their wallet before using paid features
2. **Balance Validation**: UI should check balance before initiating payments
3. **Error Handling**: Gracefully handle wallet disconnection and insufficient balance
4. **Transaction Monitoring**: Track payment status and provide user feedback

## Testing

### Development Testing
```typescript
// In your component
const { makePayment, isConnected, config } = useX402Payment();

console.log('Wallet connected:', isConnected);
console.log('Payment config:', config);

// Test payment
const result = await makePayment({
  service: 'test-service',
  amount: config.defaultAmount,
});

console.log('Payment result:', result);
```

### Production Checklist
- [ ] User can connect wallet via Account Kit
- [ ] Payment button disabled when wallet not connected
- [ ] Balance check before payment initiation
- [ ] Clear payment status feedback (processing, success, error)
- [ ] Transaction hash displayed on success
- [ ] Error messages are user-friendly
- [ ] Payment flow works with smart accounts
- [ ] USDC token approval handled correctly

## Migration Steps for Other Features

If you're adding x402 payments to other features, follow these steps:

### 1. Import the Hook
```typescript
import { useX402Payment } from '@/lib/hooks/payments/useX402Payment';
```

### 2. Use the Hook in Your Component
```typescript
function YourComponent() {
  const { makePayment, isProcessing, isConnected } = useX402Payment();
  
  // ... your component logic
}
```

### 3. Check Wallet Connection
```typescript
if (!isConnected) {
  toast.error('Please connect your wallet');
  return;
}
```

### 4. Make the Payment
```typescript
const result = await makePayment({
  service: 'your-service-name',
  amount: '1000000', // 1 USDC
  endpoint: 'https://x402.payai.network/api/base/paid-content',
  additionalData: {
    // Any additional data for your service
  },
});
```

### 5. Handle the Response
```typescript
if (result.success) {
  toast.success('Payment successful!');
  // Continue with your feature logic
} else {
  toast.error(result.error || 'Payment failed');
}
```

## Benefits of Client-Side Architecture

### For Users
- ✅ Full control over their funds
- ✅ Transparent transaction signing
- ✅ No trusted third party handling keys
- ✅ Standard wallet experience

### For Developers
- ✅ No liability for private key management
- ✅ Simpler security model
- ✅ Better separation of concerns
- ✅ Protocol compliance

### For the Application
- ✅ No server-side key storage
- ✅ Reduced security attack surface
- ✅ Scalable payment handling
- ✅ Integration with existing wallet infrastructure

## Related Files

### Created/Modified
- ✅ `lib/hooks/payments/useX402Payment.ts` - Main hook implementation
- ✅ `components/Videos/Upload/CreateThumbnailForm.tsx` - Updated to use hook
- ✅ `X402_CLIENT_SIDE_MIGRATION.md` - This documentation

### Removed
- ❌ `app/api/x402/pay-for-ai-thumbnail/route.ts` - Obsolete server-side route

## Future Enhancements

### Balance Checking
Implement real-time balance checking:
```typescript
const checkBalance = async (amount: string): Promise<boolean> => {
  // Query USDC token contract
  // Return true if balance >= amount
};
```

### Payment History
Track user's payment history:
```typescript
interface PaymentRecord {
  transactionHash: string;
  service: string;
  amount: string;
  timestamp: number;
}
```

### Multi-Token Support
Extend to support tokens beyond USDC:
```typescript
const result = await makePayment({
  service: 'service-name',
  token: ETH_TOKEN_ADDRESS, // Support ETH, DAI, etc.
  amount: '1000000000000000000', // 1 ETH
});
```

## Support

For questions or issues with x402 payments:
1. Check wallet connection via Account Kit
2. Verify USDC balance on Base chain
3. Review browser console for error messages
4. Ensure x402-fetch package is up to date
5. Check network connectivity

## References

- [x402 Protocol Documentation](https://github.com/x402-protocol)
- [Account Kit Documentation](https://accountkit.alchemy.com)
- [viem Documentation](https://viem.sh)
- [USDC on Base](https://basescan.org/token/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913)

