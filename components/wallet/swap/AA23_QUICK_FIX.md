# AA23 Error - Quick Fix Reference

## What is AA23?
**AA23** is an Account Abstraction error code that means: **"UserOperation validation or execution reverted"**

## Root Cause in Your Case
The swap transaction failed validation before execution, most likely due to:

### 🔴 Most Common: Insufficient Balance
- **ETH Balance Too Low**: Smart account doesn't have enough ETH for gas fees
- **Token Balance Too Low**: Trying to swap more tokens than you have
- **ETH Swap**: When swapping FROM ETH, you need the swap amount + gas fees

### 🔴 Account Not Deployed
- Smart account contract hasn't been deployed on Base network yet
- First transaction to account will deploy it (requires ETH)

### 🔴 Value Mismatch
- For ETH swaps, the `value` field must match the swap amount
- Quote data might have incorrect value field

## ✅ Solutions Implemented

### 1. Pre-Flight Balance Checks (Added to AlchemySwapWidget.tsx)
```typescript
// Check 1: Verify ETH balance exists
const ethBalance = await client.getBalance({ address });

// Check 2: Verify account is deployed
const code = await client.getBytecode({ address });
if (!code || code === '0x') {
  throw new Error('Account not deployed');
}

// Check 3: Ensure minimum 0.001 ETH for gas
if (ethBalance < parseEther('0.001')) {
  throw new Error('Insufficient ETH for gas');
}

// Check 4: For ETH swaps, verify total needed
if (swapping ETH) {
  const totalNeeded = swapAmount + gasBuffer;
  if (ethBalance < totalNeeded) {
    throw new Error('Insufficient ETH for swap + gas');
  }
}
```

### 2. Better Error Messages
Now shows clear, actionable error messages:
- "Insufficient ETH for gas fees. You need at least 0.001 ETH..."
- "Smart account not deployed. Please fund your account..."
- "Insufficient ETH. You need X ETH total (Y for swap + Z for gas)..."

## 🔧 How to Fix Right Now

1. **Check Your Smart Account Balance**
   - Go to: https://basescan.org/address/YOUR_ADDRESS
   - Verify ETH balance > 0.001 ETH
   - Verify token balance >= swap amount

2. **Verify Account is Deployed**
   - On BaseScan, check if "Contract" tab exists
   - If not deployed, send 0.001 ETH to your address to deploy it

3. **For ETH Swaps**
   - Need: Swap Amount + 0.001 ETH for gas
   - Example: To swap 0.01 ETH, you need at least 0.011 ETH total

## 📊 Debugging Logs Added

The swap widget now logs:
```
ETH Balance: X.XXX ETH
Account deployed: true/false
ETH Swap Check: {
  swapAmount: X.XXX,
  gasBuffer: 0.001,
  totalNeeded: X.XXX,
  available: X.XXX,
  sufficient: true/false
}
✓ All pre-flight checks passed
```

## 🎯 Prevention

The new pre-flight checks will:
1. ✅ Catch AA23 errors BEFORE sending transaction
2. ✅ Show user-friendly error messages
3. ✅ Log detailed balance information
4. ✅ Prevent wasted gas on failed transactions

## 📝 Next Steps

If you still get AA23 after these fixes:
1. Check console logs for detailed balance info
2. Verify quote data structure is correct
3. Consider using Alchemy paymaster for gas sponsorship
4. Check if EIP-7702 authorization is working correctly
