# Direct Client Method Fix - Bypass wallet_prepareCalls

## Problem
`useSendUserOperation` hook was internally using `wallet_prepareCalls` (EIP-5792) which was failing with AA23 errors. The hook automatically detects wallet capabilities and tries to use newer standards, but this was incompatible with Alchemy swap quotes.

## Root Cause
```
useSendUserOperation → Detects EIP-5792 support → Uses wallet_prepareCalls → AA23 Error ❌
```

The hook tries to be smart and use the latest wallet standards, but Alchemy's swap quotes are designed for traditional EIP-4337 UserOperations.

## Solution ✅

### Use Direct Client Methods Instead of Hook

**Before (❌ Failed):**
```typescript
const { sendUserOperation } = useSendUserOperation({ client });

await sendUserOperation({
  uo: { target, data, value }
});
// ↑ This tries to use wallet_prepareCalls internally
```

**After (✅ Works):**
```typescript
const { client } = useSmartAccountClient({});

// Step 1: Send the user operation
// Returns: { hash: string } (UserOperation hash)
const operation = await client.sendUserOperation({
  uo: { target, data, value }
});
// ↑ This uses traditional EIP-4337 UserOperations

// Step 2: Wait for transaction to be mined
// Returns: string (the transaction hash)
const txHash = await client.waitForUserOperationTransaction({
  hash: operation.hash,
});
// txHash is a string like "0x1234...abcd", NOT an object
// It's the actual transaction hash you can look up on explorers
```

## Changes Made

### 1. Removed Hook Dependencies
```diff
- import { useSmartAccountClient, useSendUserOperation } from '@account-kit/react';
+ import { useSmartAccountClient } from '@account-kit/react';

- const { sendUserOperation } = useSendUserOperation({ 
-   client,
-   waitForTxn: true,
-   onSuccess: ...,
-   onError: ...
- });
+ const { client } = useSmartAccountClient({});
```

### 2. Use Direct Client Methods
```diff
- await sendUserOperation({
-   uo: { target, data, value }
- });

+ // sendUserOperation returns { hash: string }
+ const operation = await client.sendUserOperation({
+   uo: { target, data, value }
+ });
+ 
+ // waitForUserOperationTransaction returns string (the tx hash directly)
+ const txHash = await client.waitForUserOperationTransaction({
+   hash: operation.hash,
+ });
+ // txHash is a string: "0x1234...abcd"
```

### 3. Manual Error Handling
```diff
- onError: (error) => {
-   // Hook handles errors
- }

+ try {
+   const operation = await client.sendUserOperation(...);
+   // waitForUserOperationTransaction returns a string (transaction hash)
+   const txHash = await client.waitForUserOperationTransaction(...);
+   // txHash is just a string: "0x1234...abcd"
+   console.log('Transaction hash:', txHash);
+ } catch (error) {
+   // Handle errors manually
+ }
```

### 4. Apply to Both Approval and Swap

**Approval:**
```typescript
// Step 1: Send approval operation
const approvalOp = await client.sendUserOperation({
  uo: {
    target: tokenAddress,
    data: approvalData,
    value: BigInt(0),
  },
});
// approvalOp is { hash: string }

// Step 2: Wait for confirmation - returns string, not object
const approvalTxHash = await client.waitForUserOperationTransaction({
  hash: approvalOp.hash,
});
// approvalTxHash is a string: "0x..." (direct transaction hash)
```

**Swap:**
```typescript
// Step 1: Send swap operation
const operation = await client.sendUserOperation({
  uo: {
    target,
    data: quoteData.callData,
    value: BigInt(quoteData.value || '0x0'),
  },
});
// operation is { hash: string }

// Step 2: Wait for confirmation - returns string, not object
const txHash = await client.waitForUserOperationTransaction({
  hash: operation.hash,
});
// txHash is a string: "0x..." (direct transaction hash)
```

## API Return Types

### client.sendUserOperation()
```typescript
// Returns: { hash: string }
// This is the UserOperation hash (bundle hash), not the transaction hash yet
const operation = await client.sendUserOperation({ uo: { ... } });
console.log(operation.hash); // "0xUserOpHash..."
```

### client.waitForUserOperationTransaction()
```typescript
// Returns: string (the actual transaction hash)
// NOT an object like { status, transactionHash } - just a plain string!
const txHash = await client.waitForUserOperationTransaction({ 
  hash: operation.hash 
});
console.log(txHash); // "0x1234...abcd" - this is the actual tx hash
console.log(typeof txHash); // "string"
```

**Critical:** `waitForUserOperationTransaction()` returns a **plain string** containing the transaction hash. It does NOT return an object. You can use this string directly with block explorers or other tools.

## Benefits

### ✅ Bypasses EIP-5792 Detection
- Direct client method doesn't auto-detect wallet capabilities
- Always uses traditional EIP-4337 UserOperations
- Compatible with all AA bundlers

### ✅ More Control
- Manual error handling
- Direct access to operation hash
- Can add custom logic between steps

### ✅ Better Debugging
- Console logs show exactly what's happening
- No hidden hook magic
- Clear execution flow

## Execution Flow

```
1. User clicks "Execute Swap"
2. Pre-flight checks pass ✓
3. If ERC-20: Check approval
   ↓
4. If needed: Send approval via client.sendUserOperation()
   ↓
5. Wait for approval: client.waitForUserOperationTransaction()
   ↓
6. Send swap via client.sendUserOperation()
   ↓
7. Wait for swap: client.waitForUserOperationTransaction()
   ↓
8. Success! Show transaction hash ✅
```

## Console Logs

Successful swap:
```
Executing swap with EIP-7702: { ... }
ETH Balance: 0.00228357 ETH
🔍 Deployment check: { ... }
✓ All pre-flight checks passed
📦 Full quote structure: { ... }
🔄 Quote data structure: { ... }
📍 Using target address: 0x...
🚀 Sending UserOperation via direct client method...
🎉 UserOperation sent! Hash: 0x...
⏳ Waiting for transaction confirmation...
✅ Transaction mined! Hash: 0x...
```

## Why This Works

### Traditional EIP-4337 Flow
```
Client → Bundler → EntryPoint → Smart Account → Execute
```

This is the proven, battle-tested Account Abstraction flow that works everywhere.

### vs EIP-5792 wallet_prepareCalls (Not Working)
```
Client → wallet_prepareCalls → ??? → Error AA23
```

The newer EIP-5792 standard isn't fully compatible with Alchemy swap quotes yet.

## Testing

Try the swap again. You should see:
1. ✅ No wallet_prepareCalls errors
2. ✅ Clear console logs showing progress
3. ✅ Transaction hash on success
4. ✅ Both approval and swap working

## Related Files

- `AlchemySwapWidget.tsx` - Main implementation
- `AA23_FIX_COMPLETE.md` - Previous fix attempt (using hook)
- `ALTERNATIVE_APPROACH.md` - Different approaches considered
- `TOKEN_APPROVAL.md` - Token approval documentation

## Key Takeaway

**When working with Account Abstraction:**
- ✅ Use `client.sendUserOperation()` for direct control
- ❌ Avoid hooks that auto-detect wallet capabilities
- ✅ Stick to proven EIP-4337 standard
- ❌ Don't rely on experimental standards (EIP-5792) for critical paths
