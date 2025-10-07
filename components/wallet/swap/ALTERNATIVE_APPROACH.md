# Alternative Swap Execution Approaches

## Current Issue
The `useSendUserOperation` hook is trying to use `wallet_prepareCalls` (EIP-5792) which is failing with AA23 errors.

## Alternative Approach 1: Use Client Direct Method

Instead of the hook, use the client's sendUserOperation method directly:

```typescript
// Instead of this (using hook):
const { sendUserOperation } = useSendUserOperation({ client });
await sendUserOperation({ uo: { target, data, value } });

// Try this (direct client method):
const operation = await client.sendUserOperation({
  uo: {
    target: quoteData.sender,
    data: quoteData.callData,
    value: BigInt(quoteData.value || '0x0'),
  },
});

// Wait for confirmation
const txHash = await client.waitForUserOperationTransaction({
  hash: operation.hash,
});
```

## Alternative Approach 2: Use Send Transaction

For simpler transactions, use sendTransaction:

```typescript
const hash = await client.sendTransaction({
  to: target,
  data: callData,
  value: value,
});

const receipt = await client.waitForTransactionReceipt({ hash });
```

## Alternative Approach 3: Batch Calls (if needed)

If the swap requires multiple calls:

```typescript
const { sendCallsAsync } = useSendCalls({ client });

await sendCallsAsync({
  calls: [
    { to: token, data: approvalData, value: 0n },
    { to: router, data: swapData, value: swapValue },
  ],
});
```

## Alternative Approach 4: Use Alchemy's Prepared UserOp

Use the full UserOperation from Alchemy's quote:

```typescript
// Alchemy returns a prepared UserOperation
const userOp = swapState.quote.data; // Full UserOp structure

// Send it directly
const result = await client.sendUserOperation({
  uo: userOp, // Use the entire UserOp, not just parts
});
```

## Recommendation

Based on the error, try Approach 1 (direct client method) first, as it bypasses the hook's automatic EIP-5792 detection.
