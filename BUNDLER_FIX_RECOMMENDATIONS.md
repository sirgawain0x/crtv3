# Bundler API Fix Recommendations for MeTokenSubscription

## Problem Analysis

Based on the bundler rules and current implementation, the main issues are:

1. **Gas Estimation Bug**: `eth_estimateUserOperationGas` doesn't properly simulate state changes between batched operations
2. **State Propagation Delays**: Bundler nodes may not see state changes immediately
3. **Error Code Handling**: EntryPoint AAxx error codes aren't being parsed for better diagnostics
4. **No Simulation Before Send**: Not using `alchemy_simulateUserOperationAssetChanges` to validate operations

## Recommended Fixes

### Fix 1: Use `stateOverrideSet` for Gas Estimation (Advanced)

The bundler API supports `stateOverrideSet` in `eth_estimateUserOperationGas` to simulate state changes. However, Account Kit may not expose this directly.

**Option A**: If Account Kit supports it:
```typescript
// This would require Account Kit to support stateOverrideSet
// Currently not available in the SDK
```

**Option B**: Direct bundler API call (bypass Account Kit for estimation):
```typescript
// Make direct call to bundler API with stateOverrideSet
const estimateGas = async (userOp: any, entryPoint: string) => {
  const response = await fetch(`https://base-mainnet.g.alchemy.com/v2/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_estimateUserOperationGas',
      params: [
        userOp,
        entryPoint,
        {
          // State override: simulate allowance after approve
          [daiAddress]: {
            stateDiff: {
              [`0x${allowanceSlot}`]: maxUint256.toString(16)
            }
          }
        }
      ]
    })
  });
  return response.json();
};
```

**Limitation**: Requires calculating storage slot for allowance, which is complex.

### Fix 2: Use `alchemy_simulateUserOperationAssetChanges` Before Sending

This API can validate operations and catch errors before sending:

```typescript
// Add this helper function
const simulateUserOperation = async (
  userOp: any,
  entryPoint: string,
  blockNumber?: string
) => {
  const response = await fetch(`https://base-mainnet.g.alchemy.com/v2/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_simulateUserOperationAssetChanges',
      params: [
        userOp,
        entryPoint,
        blockNumber || 'latest'
      ]
    })
  });
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Simulation failed: ${data.error.message}`);
  }
  
  return data.result;
};

// Use before sending batched operation
try {
  // Simulate the batched operation first
  const simulation = await simulateUserOperation(
    batchedUserOp,
    entryPointAddress
  );
  
  if (simulation.error) {
    console.warn('⚠️ Simulation detected error:', simulation.error);
    // Fall back to separate transactions
    throw new Error('Simulation failed, using fallback');
  }
  
  // If simulation succeeds, proceed with actual send
  const batchOperation = await client.sendUserOperation({
    uo: batchedOperations,
  });
} catch (error) {
  // Fallback logic...
}
```

### Fix 3: Parse EntryPoint Error Codes for Better Diagnostics

The bundler returns AAxx error codes that provide specific information:

```typescript
// Add error code parser
const parseBundlerError = (error: Error): {
  code?: string;
  message: string;
  suggestion: string;
} => {
  const errorMessage = error.message;
  
  // Extract AAxx code if present
  const aaCodeMatch = errorMessage.match(/AA(\d{2})/);
  const code = aaCodeMatch ? `AA${aaCodeMatch[1]}` : undefined;
  
  const suggestions: Record<string, string> = {
    'AA21': 'Insufficient native token balance. Ensure your smart account has enough ETH for gas.',
    'AA23': 'Account validation reverted. Check your smart account contract logic.',
    'AA24': 'Invalid signature. Verify you\'re using the correct private key.',
    'AA25': 'Invalid nonce. Fetch the current nonce from the EntryPoint before submitting.',
    'AA26': 'Verification gas limit exceeded. Increase verificationGasLimit in your UserOp.',
    'AA40': 'Verification gas limit exceeded (v0.6). Increase verificationGasLimit.',
    'AA94': 'Gas values overflow. Reduce gas limit values.',
    'AA95': 'Out of gas. Increase gas limits or optimize your contract calls.',
  };
  
  return {
    code,
    message: errorMessage,
    suggestion: code ? suggestions[code] || 'Unknown error code' : 'Check the error message for details',
  };
};

// Use in error handling
catch (err) {
  const parsed = parseBundlerError(err as Error);
  console.error(`❌ Bundler Error ${parsed.code || 'Unknown'}:`, parsed.message);
  setError(`${parsed.message}\n\nSuggestion: ${parsed.suggestion}`);
}
```

### Fix 4: Improve Retry Strategy Based on Error Codes

Different error codes require different retry strategies:

```typescript
const shouldRetry = (error: Error, attempt: number, maxAttempts: number): {
  shouldRetry: boolean;
  delay: number;
} => {
  const parsed = parseBundlerError(error);
  const errorMessage = error.message.toLowerCase();
  
  // Don't retry these errors
  const noRetryCodes = ['AA24', 'AA25', 'AA94', 'AA95'];
  if (parsed.code && noRetryCodes.includes(parsed.code)) {
    return { shouldRetry: false, delay: 0 };
  }
  
  // Retry with exponential backoff for state propagation issues
  if (
    errorMessage.includes('insufficient allowance') ||
    errorMessage.includes('allowance') ||
    parsed.code === 'AA21' // Didn't pay prefund (might be state sync issue)
  ) {
    const delay = Math.min(10000 * Math.pow(2, attempt - 1), 60000); // Max 60s
    return { shouldRetry: attempt < maxAttempts, delay };
  }
  
  // Retry for gas estimation errors (might be temporary)
  if (errorMessage.includes('gas') || errorMessage.includes('estimation')) {
    const delay = 5000 * attempt; // Linear backoff
    return { shouldRetry: attempt < 3, delay };
  }
  
  return { shouldRetry: false, delay: 0 };
};
```

### Fix 5: Use `rundler_maxPriorityFeePerGas` for Better Fee Estimation

Get optimal priority fee from bundler:

```typescript
const getOptimalPriorityFee = async (): Promise<bigint> => {
  const response = await fetch(`https://base-mainnet.g.alchemy.com/v2/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'rundler_maxPriorityFeePerGas',
      params: []
    })
  });
  const data = await response.json();
  return BigInt(data.result);
};

// Use when building UserOp (if Account Kit allows fee overrides)
```

### Fix 6: Check EntryPoint Nonce Before Sending

AA25 errors can be prevented by checking nonce:

```typescript
const getCurrentNonce = async (): Promise<bigint> => {
  const entryPointAddress = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
  const nonce = await client.readContract({
    address: entryPointAddress as `0x${string}`,
    abi: [
      {
        inputs: [{ name: 'sender', type: 'address' }],
        name: 'getNonce',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ] as const,
    functionName: 'getNonce',
    args: [client.account?.address as `0x${string}`],
  });
  return nonce as bigint;
};

// Use before building UserOp
const currentNonce = await getCurrentNonce();
console.log('Current EntryPoint nonce:', currentNonce);
```

## Implementation Priority

1. **High Priority**: Fix 3 (Error Code Parsing) - Immediate improvement to UX
2. **High Priority**: Fix 2 (Simulation) - Catch errors before sending
3. **Medium Priority**: Fix 4 (Smart Retry) - Better retry logic
4. **Medium Priority**: Fix 6 (Nonce Check) - Prevent AA25 errors
5. **Low Priority**: Fix 1 (State Override) - Complex, may not be needed
6. **Low Priority**: Fix 5 (Priority Fee) - Nice to have optimization

## Alternative: Use EIP-5792 `wallet_sendCalls`

If Account Kit supports it, `wallet_sendCalls` (EIP-5792) uses standard `eth_estimateGas` which properly handles state changes:

```typescript
// Check if Account Kit supports sendCallsAsync
import { sendCallsAsync } from '@account-kit/react';

// Use instead of sendUserOperation for batched operations
const calls = batchedOperations.map(op => ({
  to: op.target,
  data: op.data,
  value: op.value.toString(16), // Must be hex string
}));

const txHash = await sendCallsAsync({ calls });
```

This would be the cleanest solution if available.

