# Critical Fix: Value Must Be Hex String with 0x Prefix

## The Error

```
InvalidParamsRpcError: Invalid parameters were provided to the RPC method
Details: Must be a valid hex string starting with '0x'
Path: param
```

## Root Cause

When using EIP-5792's `wallet_sendCalls` or `wallet_prepareCalls`, the `value` field in each call **must be a hex string with `0x` prefix**, not a BigInt, number, or string without the prefix.

## The Problem in Code

```typescript
// ❌ WRONG: These all cause the error
const calls = [
  {
    to: "0x...",
    data: "0x...",
    value: BigInt(0)  // Error: not a string
  },
  {
    to: "0x...",
    data: "0x...",
    value: 0          // Error: not a string
  },
  {
    to: "0x...",
    data: "0x...",
    value: "0"        // Error: missing 0x prefix
  }
];
```

## The Fix

```typescript
// ✅ CORRECT: Convert BigInt to hex string with 0x prefix
const calls = operations.map(op => ({
  to: op.target,
  data: op.data,
  value: `0x${op.value.toString(16)}`, // Convert BigInt to hex
}));
```

## Examples

| BigInt Value | Wrong Format | Correct Format |
|--------------|--------------|----------------|
| `BigInt(0)` | `"0"` | `"0x0"` |
| `BigInt(100)` | `"100"` | `"0x64"` |
| `BigInt(1000000000000000000)` | `"1000000000000000000"` | `"0xde0b6b3a7640000"` |

## Conversion Function

```typescript
// Helper function to convert BigInt to hex string
function bigIntToHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

// Usage
const calls = operations.map(op => ({
  to: op.target,
  data: op.data,
  value: bigIntToHex(op.value),
}));
```

## Why This Format?

EIP-5792 (`wallet_sendCalls`) follows JSON-RPC standards where:
- Numeric values must be encoded as **hex strings**
- All hex strings must start with `0x` prefix
- This is consistent with other Ethereum RPC methods

## Related RPC Methods

This format requirement applies to:
- ✅ `wallet_sendCalls` (EIP-5792)
- ✅ `wallet_prepareCalls` (EIP-5792)
- ✅ `eth_sendTransaction` (standard JSON-RPC)
- ✅ `eth_call` (standard JSON-RPC)

But NOT for:
- ❌ `client.sendUserOperation` (uses BigInt directly)
- ❌ `viem` write functions (accept BigInt)
- ❌ Direct smart contract calls (use BigInt)

## The Actual Error from Logs

```javascript
// Request body that caused the error:
{
  "method": "wallet_prepareCalls",
  "params": [{
    "calls": [
      {
        "to": "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
        "data": "0x095ea7b3...",
        "value": "0"  // ❌ Missing 0x prefix
      },
      {
        "to": "0xba5502db2aC2cBff189965e991C07109B14eB3f5",
        "data": "0x0d4d1513...",
        "value": "0"  // ❌ Missing 0x prefix
      }
    ],
    "chainId": "0x2105",
    "from": "0x2953B96F9160955f6256c9D444F8F7950E6647Df"
  }]
}

// Fixed request body:
{
  "method": "wallet_prepareCalls",
  "params": [{
    "calls": [
      {
        "to": "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
        "data": "0x095ea7b3...",
        "value": "0x0"  // ✅ Has 0x prefix
      },
      {
        "to": "0xba5502db2aC2cBff189965e991C07109B14eB3f5",
        "data": "0x0d4d1513...",
        "value": "0x0"  // ✅ Has 0x prefix
      }
    ],
    "chainId": "0x2105",
    "from": "0x2953B96F9160955f6256c9D444F8F7950E6647Df"
  }]
}
```

## Implementation in MeTokenSubscription.tsx

```typescript
// Build operations with BigInt values
const operations = [
  {
    target: daiAddress,
    data: encodeFunctionData({
      abi: [...],
      functionName: 'approve',
      args: [diamondAddress, maxUint256],
    }),
    value: BigInt(0), // BigInt is fine here
  },
  {
    target: diamondAddress,
    data: encodeFunctionData({
      abi: [...],
      functionName: 'mint',
      args: [meToken, depositAmount, depositor],
    }),
    value: BigInt(0), // BigInt is fine here
  }
];

// Convert to EIP-5792 format with hex strings
const calls = operations.map(op => ({
  to: op.target,
  data: op.data,
  value: `0x${op.value.toString(16)}`, // Convert to hex string with 0x
}));

// Send using EIP-5792
const txHash = await sendCallsAsync({ calls });
```

## Testing the Fix

After applying the fix, the console should show:

```
🪙 Sending batched calls using EIP-5792 wallet_sendCalls...
📞 Sending calls with properly formatted values: [
  {
    to: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
    data: "0x095ea7b3...",
    value: "0x0"  // ✅ Properly formatted
  },
  {
    to: "0xba5502db2aC2cBff189965e991C07109B14eB3f5",
    data: "0x0d4d1513...",
    value: "0x0"  // ✅ Properly formatted
  }
]
✅ Batch transaction completed: 0x...
```

## Summary

**Problem**: EIP-5792 `wallet_sendCalls` requires `value` to be a hex string with `0x` prefix

**Solution**: Convert BigInt values to hex strings:
```typescript
value: `0x${bigIntValue.toString(16)}`
```

**Result**: Transaction succeeds without "Invalid parameters" error

---

**Status**: ✅ **FIXED IN METOKEN SUBSCRIPTION COMPONENT**

This fix ensures proper formatting of all parameters for EIP-5792 RPC calls.

