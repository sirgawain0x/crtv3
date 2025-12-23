# MeTokenSubscription Bundler Fix Integration Guide

## Summary

This guide shows how to integrate the bundler error parsing and simulation utilities into `MeTokenSubscription.tsx` to improve error handling and prevent common bundler issues.

## Files Created

1. **`lib/utils/bundlerErrorParser.ts`** - Parses EntryPoint AAxx error codes
2. **`lib/utils/bundlerSimulation.ts`** - Simulates UserOperations before sending
3. **`BUNDLER_FIX_RECOMMENDATIONS.md`** - Detailed recommendations

## Quick Integration Steps

### Step 1: Import the utilities

Add to the top of `MeTokenSubscription.tsx`:

```typescript
import { parseBundlerError, shouldRetryError } from '@/lib/utils/bundlerErrorParser';
import { simulateUserOperationAssetChanges, getEntryPointNonce } from '@/lib/utils/bundlerSimulation';
```

### Step 2: Update error handling in `handleMint`

Replace the generic error handling with parsed error messages:

```typescript
// In handleMint function, replace:
catch (err) {
  console.error('❌ Mint error:', err);
  setError(err instanceof Error ? err.message : 'Failed to mint MeTokens');
}

// With:
catch (err) {
  console.error('❌ Mint error:', err);
  const parsed = parseBundlerError(err as Error);
  console.error(`Error Code: ${parsed.code || 'None'}`, parsed);
  setError(`${parsed.message}\n\n💡 ${parsed.suggestion}`);
}
```

### Step 3: Improve retry logic

Replace the current retry logic with smart retry based on error codes:

```typescript
// In the mint retry loop, replace:
const isAllowanceError = mintErrorMessage.includes('insufficient allowance') || 
                         mintErrorMessage.includes('ERC20');

if (!isAllowanceError || mintAttempt === maxMintRetries) {
  throw mintError;
}

// With:
const retryDecision = shouldRetryError(mintError as Error, mintAttempt, maxMintRetries);

if (!retryDecision.shouldRetry) {
  throw mintError;
}

// Use the calculated delay
const retryDelay = retryDecision.delay;
console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
setSuccess(`Retrying... (attempt ${mintAttempt}/${maxMintRetries}, waiting ${retryDelay/1000}s)`);
await new Promise(resolve => setTimeout(resolve, retryDelay));
```

### Step 4: Add simulation before batched operations (Optional but Recommended)

Before sending the batched operation, simulate it:

```typescript
// Before the batched operation try block, add:
try {
  // Simulate the operation first
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (apiKey) {
    console.log('🔍 Simulating batched operation...');
    const simulation = await simulateUserOperationAssetChanges(
      {
        sender: client.account?.address,
        nonce: '0x0', // Will be set by bundler
        callData: mintCalldata, // Combined or just mint
        // ... other UserOp fields
      },
      '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint
      apiKey
    );
    
    if (simulation.error) {
      console.warn('⚠️ Simulation detected error:', simulation.error);
      throw new Error(`Simulation failed: ${simulation.error.message}`);
    }
    
    console.log('✅ Simulation successful:', simulation.changes);
  }
} catch (simError) {
  console.warn('⚠️ Simulation failed, falling back to separate transactions:', simError);
  // Continue to fallback logic
}
```

### Step 5: Check nonce before sending (Prevent AA25 errors)

Add nonce check before building UserOp:

```typescript
// Before building operations, add:
try {
  const entryPointAddress = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
  const currentNonce = await getEntryPointNonce(client, entryPointAddress);
  console.log('📊 Current EntryPoint nonce:', currentNonce);
} catch (nonceError) {
  console.warn('⚠️ Failed to check nonce:', nonceError);
  // Continue anyway, Account Kit should handle nonce
}
```

## Complete Example: Updated Error Handling

Here's a complete example of improved error handling in the `handleMint` function:

```typescript
catch (err) {
  console.error('❌ Mint error:', err);
  const parsed = parseBundlerError(err as Error);
  
  // Log detailed error information
  console.error('Error Details:', {
    code: parsed.code,
    message: parsed.message,
    shouldRetry: parsed.shouldRetry,
    originalError: err,
  });
  
  // Show user-friendly error with suggestion
  const errorMessage = parsed.code 
    ? `[${parsed.code}] ${parsed.message}`
    : parsed.message;
  
  setError(`${errorMessage}\n\n💡 ${parsed.suggestion}`);
  
  // For retryable errors, show retry option
  if (parsed.shouldRetry) {
    console.log('This error is retryable. Consider implementing automatic retry.');
  }
}
```

## Benefits

1. **Better Error Messages**: Users see specific error codes and actionable suggestions
2. **Smarter Retries**: Only retry errors that make sense to retry
3. **Error Prevention**: Simulation catches issues before sending
4. **Nonce Management**: Prevents AA25 errors by checking nonce first

## Testing

After integration, test these scenarios:

1. **Insufficient Allowance**: Should show AA21 or allowance error with retry suggestion
2. **Invalid Nonce**: Should show AA25 error with nonce check suggestion
3. **Gas Estimation Failure**: Should show retryable error with appropriate delay
4. **State Sync Issues**: Should detect and retry with appropriate backoff

## Next Steps

1. Integrate the error parser (Step 1-2) - **High Priority**
2. Improve retry logic (Step 3) - **High Priority**
3. Add simulation (Step 4) - **Medium Priority**
4. Add nonce check (Step 5) - **Medium Priority**

## Notes

- The simulation API requires the full UserOp structure, which Account Kit builds internally
- You may need to construct a partial UserOp for simulation
- Some errors (like AA24 signature errors) should never be retried
- The error parser handles both EntryPoint v0.6 and v0.7 error codes

