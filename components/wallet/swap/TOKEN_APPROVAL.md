# Token Approval for Swaps - Implementation Guide

## Problem Solved
When swapping ERC-20 tokens (USDC, DAI), users were getting "Token approval required" errors. This is because smart contracts need permission to spend your tokens.

## What is Token Approval?

Token approval is a **two-step process** required for ERC-20 token swaps:

### Step 1: Approve
Give the swap router contract permission to spend your tokens.

### Step 2: Swap  
The swap router can now transfer your tokens to execute the swap.

## Implementation

### Automatic Approval Detection ✅

The swap widget now automatically:
1. **Checks if approval is needed** before swapping
2. **Requests approval** if needed (Step 1)
3. **Executes the swap** after approval (Step 2)

### Code Flow

```typescript
// 1. Check if swapping FROM an ERC-20 token (not ETH)
if (swapState.fromToken !== 'ETH') {
  
  // 2. Check current allowance
  const allowance = await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress, spenderAddress],
  });
  
  // 3. If insufficient, request approval
  if (allowance < swapAmount) {
    // Send approval transaction
    await sendUserOperation({
      uo: {
        target: tokenAddress,
        data: approvalData,
        value: BigInt(0),
      },
    });
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// 4. Execute swap
await sendUserOperation({
  uo: {
    target: routerAddress,
    data: swapData,
    value: swapValueIfETH,
  },
});
```

## User Experience

### For ETH Swaps
- ✅ **No approval needed**
- 1 transaction only
- User clicks "Execute Swap" → Swap happens

### For ERC-20 Swaps (USDC, DAI)
- ⚠️ **Approval may be needed** (first time)
- 2 transactions if first time, 1 transaction after
- User clicks "Execute Swap" → Approval → Swap

### Button States

| State | Button Text |
|-------|-------------|
| Ready | "Execute Swap" |
| Getting quote | "Getting Quote..." |
| Approving | "Approving USDC..." |
| Swapping | "Executing Swap..." |
| Complete | "Execute Swap" (resets) |

## Technical Details

### Max Approval Strategy

We use `maxUint256` for approvals to avoid repeated approvals:

```typescript
args: [spenderAddress, maxUint256], // Max approval = 2^256 - 1
```

**Benefits:**
- ✅ Only approve once per token
- ✅ No approval needed for subsequent swaps
- ✅ Better UX (less transactions)

**Security:**
- Standard practice in DeFi
- Only approves the specific swap router
- Can be revoked anytime

### Approval Tracking

We track approval state separately:

```typescript
const [isApprovingToken, setIsApprovingToken] = useState(false);

// In onSuccess callback
if (isApprovingToken) {
  // Approval completed → continue to swap
  setIsApprovingToken(false);
} else {
  // Swap completed → show success
  setTransactionHash(hash);
}
```

## Common Scenarios

### Scenario 1: First USDC Swap
1. User enters amount
2. Clicks "Execute Swap"
3. Button: "Approving USDC..."
4. Wallet confirms approval
5. Button: "Executing Swap..."
6. Wallet confirms swap
7. ✅ Success!

### Scenario 2: Second USDC Swap
1. User enters amount
2. Clicks "Execute Swap"
3. Allowance check passes ✅
4. Button: "Executing Swap..."
5. Wallet confirms swap
6. ✅ Success!

### Scenario 3: ETH Swap (No Approval)
1. User enters amount
2. Clicks "Execute Swap"
3. Button: "Executing Swap..."
4. Wallet confirms swap
5. ✅ Success!

## Error Handling

### Approval Errors
```typescript
catch (approvalError) {
  setIsApprovingToken(false);
  throw new Error(
    `Failed to approve ${token} for swap. ${error.message}`
  );
}
```

### Common Error Messages
- ❌ "Failed to approve USDC for swap"
- ❌ "User rejected approval transaction"
- ❌ "Insufficient ETH for gas fees"

## Checking Approval Status

Users can check their current approvals:

```typescript
// Get current allowance for a token
const allowance = await client.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [userAddress, spenderAddress],
});

console.log('Current allowance:', allowance.toString());
```

## Revoking Approvals

To revoke an approval (set to 0):

```typescript
const revokeData = encodeFunctionData({
  abi: erc20Abi,
  functionName: 'approve',
  args: [spenderAddress, BigInt(0)], // Set to 0
});
```

## Security Considerations

### Safe Practices ✅
- Only approve trusted contracts
- Use max approval for convenience
- Approvals are per-contract, not global
- Can always be revoked

### What We Approve
- Spender: The swap router contract from Alchemy quote
- Amount: `maxUint256` (unlimited)
- Token: Only the specific token being swapped

### What's Protected
- ✅ Other tokens are not affected
- ✅ Only approved contract can spend
- ✅ User must confirm each transaction
- ✅ Approvals persist but can be revoked

## Testing Checklist

- [ ] First USDC → DAI swap (requires approval)
- [ ] Second USDC → DAI swap (no approval needed)
- [ ] ETH → USDC swap (no approval)
- [ ] User rejects approval (shows error)
- [ ] User rejects swap (shows error)
- [ ] Insufficient balance (blocked by pre-flight check)
- [ ] Insufficient ETH for gas (blocked by pre-flight check)

## Console Logs

Successful approval flow:
```
📋 Checking USDC approval...
Current allowance: 0, needed: 1000000
⚠️ Insufficient allowance, requesting approval...
📝 Sending approval for USDC...
✅ Approval transaction sent
✅ Token approval successful! Hash: 0x...
✅ Approval confirmed, proceeding to swap...
🔄 Quote data structure: { ... }
🎉 UserOperation sent: { ... }
⏳ Waiting for transaction confirmation...
✅ Swap successful! Transaction hash: 0x...
```

## Benefits

### For Users
- ✅ Seamless experience
- ✅ Clear status messages
- ✅ One-time approval per token
- ✅ Automatic handling

### For Developers
- ✅ No manual approval management
- ✅ Follows DeFi best practices
- ✅ Proper error handling
- ✅ Clear console logging

## Related Files

- `AlchemySwapWidget.tsx` - Main implementation
- `swap-service.ts` - Token addresses and formatting
- `MeTokenTrading.tsx` - Similar approval pattern (reference)

## Resources

- [ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20)
- [Understanding Token Approvals](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/#approve)
- [Viem ERC-20 ABI](https://viem.sh/docs/contract/functions/approve)
