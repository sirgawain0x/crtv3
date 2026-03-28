# RPC Error vs Contract Error: How to Distinguish

## Quick Answer

**The RPC error is NOT your contract's fault.** It's an infrastructure/state synchronization issue.

## Understanding the Difference

### Contract Errors (Your Contract's Fault)

These are actual issues with your contract logic or parameters:

- **AA23**: Account validation reverted
  - Your contract's `validateUserOp` function reverted
  - Check your contract's validation logic
  - Verify parameters are correct

- **AA24**: Invalid signature
  - Signature verification failed in your contract
  - Check signature format and chainId
  - Verify you're using the correct private key

- **AA25**: Invalid account nonce
  - Nonce mismatch in your contract
  - Fetch current nonce before submitting
  - May indicate a contract state issue

### RPC/Infrastructure Errors (NOT Your Contract's Fault)

These are caused by RPC node state synchronization issues:

- **"insufficient allowance"** during gas estimation
  - The bundler's RPC node doesn't see the allowance yet
  - Different nodes in Alchemy's load balancer may have different states
  - **Solution**: Always batch approve + mint, or wait for state propagation

- **Gas estimation errors**
  - RPC node state sync issues
  - Node hasn't synced latest blockchain state
  - **Solution**: Retry with exponential backoff

- **State synchronization errors**
  - RPC nodes haven't propagated state changes
  - Known limitation of distributed RPC infrastructure
  - **Solution**: Wait for state propagation or use batched operations

## How the Error Parser Works

The `parseBundlerError` function analyzes errors and categorizes them:

```typescript
// Contract Error Example
{
  code: 'AA23',
  message: 'Account validation reverted',
  suggestion: 'Investigate validateUserOp logic using tools like Tenderly.',
  isContractError: true,  // ✅ This is your contract's fault
  isRpcError: false
}

// RPC Error Example
{
  code: undefined,
  message: 'Insufficient allowance',
  suggestion: 'The bundler may not see the allowance yet. Wait a few seconds and retry.',
  isContractError: false,
  isRpcError: true  // ✅ This is NOT your contract's fault
}
```

## What the Code Does Now

1. **Parses all errors** using `parseBundlerError()`
2. **Categorizes errors** as contract errors or RPC errors
3. **Shows clear error messages** that explain the difference:
   - Contract errors: "⚠️ This is a contract-level error. Please check your contract logic."
   - RPC errors: "ℹ️ This error is NOT from your contract. It's caused by RPC node state synchronization issues."
4. **Logs error analysis** to console for debugging

## Common RPC Errors (NOT Contract Issues)

### "insufficient allowance" during gas estimation

**What happens:**
1. You approve DAI yesterday ✅
2. Transaction confirms on-chain ✅
3. You try to mint today
4. Gas estimation hits Node B (doesn't see yesterday's approval) ❌
5. Error: "insufficient allowance"

**Why:**
- Alchemy's RPC load balancer distributes requests across multiple nodes
- Different nodes may have different states
- Node B hasn't synced the approval transaction yet

**Solution:**
- Always batch approve + mint (current implementation)
- Gas estimation sees both operations in the same simulation
- No waiting for state propagation needed

### Gas estimation failures

**What happens:**
1. Bundler calls `eth_estimateUserOperationGas`
2. RPC node doesn't have latest state
3. Estimation fails

**Why:**
- RPC node state sync delays
- Known limitation of distributed infrastructure

**Solution:**
- Retry with exponential backoff
- Use simulation API before sending
- Fallback to separate transactions

## Error Message Examples

### Contract Error (Your Contract's Fault)

```
Contract Error [AA23]: Account validation reverted

💡 Investigate validateUserOp logic using tools like Tenderly. Check verificationGasLimit is sufficient.

⚠️ This is a contract-level error. Please check your contract logic and parameters.
```

### RPC Error (NOT Your Contract's Fault)

```
RPC/Infrastructure Error: Insufficient allowance

💡 The bundler may not see the allowance yet. Wait a few seconds and retry, or use separate approve + mint transactions.

ℹ️ This error is NOT from your contract. It's caused by RPC node state synchronization issues.
The bundler's RPC node may not have synced the latest blockchain state yet.
This is a known limitation of distributed RPC infrastructure.
```

## Debugging Tips

1. **Check the error code**: AA23, AA24, AA25 = contract error
2. **Check the error message**: "insufficient allowance", "estimation" = RPC error
3. **Check console logs**: Look for "Error Analysis" logs
4. **Check error category**: `isContractError` vs `isRpcError`

## Key Takeaways

1. **RPC errors are NOT your contract's fault** - They're infrastructure issues
2. **Contract errors ARE your contract's fault** - Check your contract logic
3. **Always batch interdependent operations** - Eliminates RPC state sync issues
4. **Use error parser** - Helps distinguish between error types
5. **Check console logs** - Provides detailed error analysis

## Files Modified

- `components/UserProfile/MeTokenSubscription.tsx` - Added error parsing and categorization
- `lib/utils/bundlerErrorParser.ts` - Error parsing utilities (already exists)
- `RPC_ERROR_VS_CONTRACT_ERROR.md` - This documentation

## Next Steps

1. Test the error handling with different error scenarios
2. Monitor console logs for error analysis
3. Update error messages based on user feedback
4. Consider adding more error categories if needed

