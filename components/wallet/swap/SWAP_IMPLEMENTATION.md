# Alchemy Swap Implementation Guide

## Overview
This document explains the proper implementation of Alchemy swaps using their RPC API and smart wallet integration.

## The Problem (Fixed)

### Previous Implementation (❌ Failed)
The original implementation tried to execute swaps through a backend API route using a private key. This failed because:

1. **Wrong Private Key Type**: The `.env.local` had an Alchemy API key instead of an Ethereum private key
2. **Backend Complexity**: Required additional server-side configuration
3. **Security Concerns**: Storing private keys on the server is risky
4. **HTTP 500 Errors**: Backend couldn't initialize the swap client properly

### New Implementation (✅ Working)
Now swaps execute directly from the user's connected smart wallet client using Alchemy's RPC API.

## Alchemy Swap Flow

The proper Alchemy swap implementation follows these steps:

### Step 1: Request Swap Quote
```typescript
const quoteResponse = await alchemySwapService.requestSwapQuote({
  from: address,
  fromToken: 'ETH',
  toToken: 'USDC',
  fromAmount: '0xde0b6b3a7640000', // 1 ETH in wei
});
```

**Response includes:**
- `quote.minimumToAmount` - Expected output amount
- `signatureRequest.rawPayload` - Data to sign
- `type` & `data` - For sending prepared calls
- `feePayment` - Gas sponsorship info (if using paymaster)

### Step 2: Sign the Prepared Calls
```typescript
const signature = await client.signMessage({
  account: client.account,
  message: { raw: signatureRequest.rawPayload },
});
```

**What happens:**
- User's smart wallet client signs the swap transaction
- Signature authorizes the prepared calls
- No private key needed from backend

### Step 3: Send Prepared Calls
```typescript
const sendRequest = {
  method: 'wallet_sendPreparedCalls',
  params: [{
    type: quote.type,
    data: quote.data,
    chainId: '0x2105', // Base mainnet
    signature: {
      type: 'secp256k1',
      data: signature,
    },
  }],
};

const response = await fetch(`https://api.g.alchemy.com/v2/${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 1, jsonrpc: '2.0', ...sendRequest }),
});

const result = await response.json();
const callId = result.result.preparedCallIds[0];
```

**What happens:**
- Alchemy receives the signed transaction
- Returns a `callId` for tracking
- Transaction is submitted to the blockchain

### Step 4: Poll for Confirmation
```typescript
let attempts = 0;
const maxAttempts = 60;

while (attempts < maxAttempts) {
  const statusRequest = {
    method: 'wallet_getCallsStatus',
    params: [[callId]],
  };

  const statusResponse = await fetch(`https://api.g.alchemy.com/v2/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', ...statusRequest }),
  });

  const statusResult = await statusResponse.json();
  const status = statusResult.result.status;

  if (status === 200) {
    // Success! Get transaction hash
    const txHash = statusResult.result.receipts[0].transactionHash;
    break;
  } else if (status >= 400) {
    // Failed
    throw new Error(`Transaction failed with status ${status}`);
  }

  // Still pending, wait and retry
  await new Promise(resolve => setTimeout(resolve, 2000));
  attempts++;
}
```

**Status Codes:**
- `100` - Pending (transaction submitted)
- `200` - Confirmed (success!)
- `400` - Offchain Failure (pre-execution failure)
- `500` - Onchain Failure (reverted on-chain)

## Complete Implementation

Here's the full `handleExecuteSwap` function:

```typescript
const handleExecuteSwap = async () => {
  if (!address || !swapState.quote || !client) return;

  try {
    setSwapState(prev => ({ ...prev, isSwapping: true, error: null }));

    // Step 1: Get signature request from quote
    const signatureRequest = swapState.quote.signatureRequest;
    
    if (!signatureRequest?.rawPayload) {
      throw new Error('Invalid quote: missing signature request');
    }

    // Step 2: Sign with user's smart wallet
    const signature = await client.signMessage({
      account: client.account,
      message: { raw: signatureRequest.rawPayload },
    });

    // Step 3: Send prepared calls
    const sendPreparedCallsRequest = {
      id: 1,
      jsonrpc: '2.0',
      method: 'wallet_sendPreparedCalls',
      params: [{
        type: swapState.quote.type,
        data: swapState.quote.data,
        chainId: '0x2105', // Base mainnet
        signature: {
          type: 'secp256k1',
          data: signature,
        },
      }],
    };

    const response = await fetch(
      `https://api.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendPreparedCallsRequest),
      }
    );

    const sendResult = await response.json();
    
    if (sendResult.error) {
      throw new Error(`RPC Error: ${sendResult.error.message}`);
    }

    const callId = sendResult.result.preparedCallIds[0];

    // Step 4: Poll for confirmation
    let attempts = 0;
    const maxAttempts = 60;
    let txHash = null;

    while (attempts < maxAttempts) {
      const statusRequest = {
        id: 1,
        jsonrpc: '2.0',
        method: 'wallet_getCallsStatus',
        params: [[callId]],
      };

      const statusResponse = await fetch(
        `https://api.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statusRequest),
        }
      );

      const statusResult = await statusResponse.json();
      const status = statusResult.result.status;

      if (status === 200) {
        txHash = statusResult.result.receipts[0].transactionHash;
        break;
      } else if (status >= 400) {
        throw new Error(`Transaction failed with status ${status}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    if (!txHash) {
      throw new Error('Transaction timed out');
    }

    setSwapState(prev => ({ ...prev, transactionHash: txHash }));
    onSwapSuccess?.();

  } catch (error) {
    setSwapState(prev => ({
      ...prev,
      error: error instanceof Error ? error.message : 'Swap execution failed',
    }));
  } finally {
    setSwapState(prev => ({ ...prev, isSwapping: false }));
  }
};
```

## Key Benefits

### ✅ Client-Side Execution
- No backend server required
- No private key management
- Uses user's connected wallet

### ✅ Secure by Design
- User signs with their smart wallet
- No server-side keys to compromise
- All operations client-side

### ✅ Gas Sponsorship
- Supports Alchemy Gas Manager
- Can enable gasless swaps for users
- Paymaster integration included

### ✅ Real-time Status
- Polls for transaction confirmation
- Shows pending/confirmed/failed states
- Returns transaction hash on success

## Environment Variables Required

Only one environment variable is needed:

```bash
# .env.local
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
```

Optional (for gas sponsorship):
```bash
NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID=your_policy_id_here
```

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid quote: missing signature request" | Quote doesn't have signatureRequest | Re-request quote |
| "RPC Error: ..." | Alchemy API error | Check API key, network status |
| "Transaction failed with status 400" | Offchain failure | Check balance, permissions |
| "Transaction failed with status 500" | Onchain revert | Check contract logic, slippage |
| "Transaction timed out" | Took > 2 minutes | Increase maxAttempts or check network |

### Error Display
```typescript
{swapState.error && (
  <Alert variant="destructive">
    <XCircle className="h-4 w-4" />
    <AlertDescription>
      <div>{swapState.error}</div>
      {swapState.error.includes('Insufficient balance') && (
        <div className="mt-2 text-xs">
          <a href={`/send?address=${address}`}>
            Add funds to your wallet
          </a>
        </div>
      )}
    </AlertDescription>
  </Alert>
)}
```

## Testing Checklist

- [ ] Request quote successfully
- [ ] Sign message with smart wallet
- [ ] Send prepared calls
- [ ] Poll for confirmation
- [ ] Display transaction hash
- [ ] Handle insufficient balance
- [ ] Handle network errors
- [ ] Handle timeout scenarios
- [ ] Test with gas sponsorship
- [ ] Verify on BaseScan

## Production Considerations

### 1. Gas Estimation
```typescript
// Add gas estimation before swap
const estimatedGas = await client.estimateGas({
  account: client.account,
  to: toAddress,
  data: callData,
});
```

### 2. Slippage Protection
```typescript
// Allow user to set slippage tolerance
const slippage = 50; // 0.5% in basis points
const quote = await alchemySwapService.requestSwapQuote({
  ...params,
  slippage: `0x${slippage.toString(16)}`,
});
```

### 3. Price Impact Warning
```typescript
// Calculate and show price impact
const priceImpact = ((expectedPrice - actualPrice) / expectedPrice) * 100;
if (priceImpact > 1) {
  // Show warning to user
}
```

### 4. Balance Refresh
```typescript
// Refresh balances after successful swap
useEffect(() => {
  if (swapState.transactionHash) {
    setTimeout(fetchBalances, 3000); // Wait for confirmation
  }
}, [swapState.transactionHash]);
```

## Resources

- [Alchemy Swaps Documentation](https://docs.alchemy.com/docs/swaps-overview)
- [Account Kit Documentation](https://accountkit.alchemy.com/docs)
- [Base Network](https://base.org/)
- [Viem Documentation](https://viem.sh/)

## Support

For issues:
1. Check console logs for detailed error messages
2. Verify environment variables are set
3. Ensure wallet is connected and on Base network
4. Check account has sufficient balance
5. Review Alchemy dashboard for API status
