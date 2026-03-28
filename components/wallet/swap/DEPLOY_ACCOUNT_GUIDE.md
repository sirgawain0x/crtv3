# Smart Account Deployment Guide

## Problem
You're seeing: **"Smart account not deployed. Please fund your account with ETH first to deploy it."**

This means your smart contract wallet address exists, but the contract code hasn't been deployed on the Base network yet.

## What is Smart Account Deployment?

When you create a smart account (Smart Contract Account), it generates an address **counterfactually** - the address exists and can receive funds, but the actual smart contract code isn't deployed until the first transaction.

### Your Smart Account Address
```
The error message shows: "Your smart account address: 0x..."
```

This is your **smart contract wallet address** on Base network.

## How to Deploy Your Account

### Option 1: Send ETH Directly (Recommended)
1. **Copy your smart account address** from the error message
2. **Send at least 0.001 ETH** to this address from:
   - A centralized exchange (Coinbase, Binance, etc.)
   - Another wallet (MetaMask, Rainbow, etc.)
   - A faucet (for testnet)
3. **Wait for confirmation** (usually 1-2 minutes on Base)
4. **The account will auto-deploy** on the first incoming transaction

### Option 2: Use a Bridge
1. Go to [Base Bridge](https://bridge.base.org)
2. Bridge ETH from Ethereum mainnet to your smart account address on Base
3. The bridging process will deploy the account automatically

### Option 3: Use a Faucet (Testnet Only)
If you're on Base Sepolia testnet:
1. Go to [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Enter your smart account address
3. Request testnet ETH

## How Much ETH Do You Need?

### Minimum Amounts:
- **To deploy account:** 0.001 ETH (~$2-3)
- **To perform swaps:** 0.001 ETH for gas + swap amount
- **Recommended starting balance:** 0.01 ETH (~$20-30)

### Example Scenarios:
| Action | ETH Needed |
|--------|------------|
| Deploy account only | 0.001 ETH |
| Swap 0.01 ETH → USDC | 0.011 ETH (0.01 swap + 0.001 gas) |
| Swap USDC → DAI | 0.001 ETH (just gas) |

## Verify Deployment

After sending ETH, check if your account is deployed:

1. **Go to BaseScan:**
   ```
   https://basescan.org/address/YOUR_SMART_ACCOUNT_ADDRESS
   ```

2. **Look for "Contract" tab:**
   - ✅ If you see a "Contract" tab → Account is deployed!
   - ❌ If no "Contract" tab → Still not deployed (wait for transaction to confirm)

3. **Check the code:**
   - Click the "Contract" tab
   - You should see contract bytecode
   - If you see "Contract Source Code Not Verified" - that's OK! Your account is still deployed.

## Common Issues

### Issue 1: I sent ETH but account still not deployed
**Solution:**
- Wait 2-5 minutes for Base network confirmation
- Check transaction status on BaseScan
- Refresh the page and try swap again

### Issue 2: I don't have any ETH
**Solution:**
- Buy ETH on a centralized exchange (Coinbase, Binance, Kraken)
- Withdraw directly to Base network using your smart account address
- Make sure to select "Base" as the withdrawal network

### Issue 3: I sent ETH to wrong address
**Solution:**
- Make sure you sent to the **smart account address** shown in the error message
- NOT your EOA (externally owned account) address
- Check the "Accounts" section in the UI to see both addresses

### Issue 4: Account deployed but swap still fails
**Solution:**
- The AA23 error has multiple causes
- Check the other pre-flight checks:
  - Sufficient ETH for gas (minimum 0.001 ETH remaining after swap)
  - Sufficient token balance for swap amount
- See `AA23_QUICK_FIX.md` for more diagnostics

## Technical Details

### What happens during deployment?

1. **First transaction to the account** triggers deployment
2. **Smart contract code is deployed** to the blockchain
3. **Account becomes fully functional** for all operations
4. **Gas fees are paid** from the incoming ETH

### Smart Account vs EOA

| Feature | EOA (MetaMask) | Smart Account |
|---------|----------------|---------------|
| Deployment | Instant, free | Requires first transaction |
| Recovery | Only via seed phrase | Can add social recovery |
| Gas | Paid in ETH only | Can use paymasters |
| Multi-sig | Not supported | Supported |
| Batching | Not supported | Supported |

## After Deployment

Once deployed, your smart account can:
- ✅ Perform swaps
- ✅ Send transactions
- ✅ Interact with DeFi protocols
- ✅ Receive and hold tokens
- ✅ Use all Account Kit features

## Need Help?

If you're still having issues:
1. Check console logs for detailed error messages
2. Verify on BaseScan that transaction was successful
3. Ensure you're on Base Mainnet (Chain ID: 8453)
4. Check that you have sufficient ETH balance
5. See `AA23_DEBUG.md` for comprehensive debugging

## Resources

- [Base Bridge](https://bridge.base.org)
- [BaseScan](https://basescan.org)
- [Account Kit Docs](https://accountkit.alchemy.com)
- [Base Network Docs](https://docs.base.org)
