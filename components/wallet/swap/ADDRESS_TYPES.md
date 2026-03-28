# Understanding Account Kit Address Types

## Two Address System

Account Kit uses a **two-address system**:

### 1. Controller Address (EOA - Externally Owned Account)
**Example:** `0x98C08B106c7e4FA5c8A655a3F75F3b3F553e760E`

**What it is:**
- Your traditional wallet address (like MetaMask)
- The "owner" or "signer" of your smart account
- Controls and authorizes actions for the smart account

**Properties:**
- ✅ Exists immediately (no deployment needed)
- ✅ Can sign messages using private key
- ✅ Cannot hold smart account features (no batching, gas sponsorship, etc.)
- ❌ Not the address where your funds are stored in Account Kit

**Where it comes from:**
```typescript
const user = useUser();
const controllerAddress = user.address; // EOA address
```

**Used for:**
- Authenticating with Account Kit
- Signing approvals for smart account actions
- Proving ownership of the smart account

---

### 2. Smart Account Address (SCA - Smart Contract Account)
**Example:** `0x2953B96F9160955f6256c9D444F8F7950E6647Df`

**What it is:**
- Your actual wallet where funds are stored
- A smart contract deployed on-chain
- Provides advanced features (batching, gas sponsorship, recovery, etc.)

**Properties:**
- ⚠️ Requires deployment (contract code must be on-chain)
- ✅ Holds all your tokens and assets
- ✅ Supports Account Abstraction features (EIP-4337)
- ✅ Can be controlled by multiple signers
- ✅ Programmable (can add modules, permissions, etc.)

**Where it comes from:**
```typescript
const { client, address } = useSmartAccountClient({});
const smartAccountAddress = address; // SCA address
// OR
const smartAccountAddress = client.account.address;
```

**Used for:**
- Receiving and holding tokens
- Executing swaps and transactions
- Interacting with DeFi protocols
- All on-chain operations

---

## How They Work Together

```
┌─────────────────────────┐
│   Controller (EOA)      │
│  0x98C0...760E          │
│                         │
│  - Signs approvals      │
│  - Proves ownership     │
│  - No funds stored      │
└───────────┬─────────────┘
            │ controls
            ▼
┌─────────────────────────┐
│  Smart Account (SCA)    │
│  0x2953...647Df         │
│                         │
│  - Holds all funds      │
│  - Executes txs         │
│  - Deployed contract    │
└─────────────────────────┘
```

## In the Swap Widget

The widget correctly uses the **Smart Account Address**:

```typescript
const { address, client } = useSmartAccountClient({});
// address = 0x2953...647Df (Smart Account, NOT Controller)

// Pre-flight checks:
const ethBalance = await client.getBalance({ address }); // Check SCA balance
const code = await client.transport.request({
  method: "eth_getCode",
  params: [address, "latest"], // Check if SCA is deployed
});
```

## How to Check Which Address

### Get Both Addresses:
```typescript
import { useUser } from "@account-kit/react";
import { useSmartAccountClient } from "@account-kit/react";

const user = useUser();
const { client } = useSmartAccountClient({});

console.log('Controller (EOA):', user.address);
console.log('Smart Account (SCA):', client?.account?.address);
```

### Using Wallet Status Hook:
```typescript
import { useWalletStatus } from "@/lib/hooks/accountkit/useWalletStatus";

const { 
  walletAddress,        // Controller (EOA)
  smartAccountAddress   // Smart Account (SCA)
} = useWalletStatus();
```

## Common Confusion Points

### "Which address should I fund?"
➡️ **Smart Account Address** (0x2953...647Df)
- This is where your tokens live
- This is what needs ETH for gas fees
- This is what needs to be deployed

### "Which address do I see on BaseScan?"
➡️ Both! But you primarily care about:
- **Smart Account** for checking balances, transactions, deployment
- Controller is just an EOA, less interesting

### "Why does my wallet show a different address?"
➡️ If you're using Account Kit:
- External wallets (MetaMask, etc.) show the **Controller**
- Account Kit UI shows the **Smart Account**
- They're different but linked!

### "Which address receives tokens?"
➡️ **Smart Account Address**
- Always send tokens to the Smart Account
- The Controller doesn't hold funds in Account Kit

## Deployment Check Logic

The swap widget checks if **Smart Account** is deployed:

```typescript
// Correct: Check smart account
const code = await client.transport.request({
  method: "eth_getCode",
  params: [smartAccountAddress, "latest"],
});

// Wrong: Don't check controller
// Controllers (EOAs) don't have deployment status
```

## Why Two Addresses?

**Benefits:**
1. **Security:** Private key stays in EOA, funds in contract
2. **Flexibility:** Can change controllers without moving funds
3. **Features:** Smart account has programmable logic
4. **Recovery:** Can add/remove controllers for social recovery
5. **Gas:** Can use paymasters for sponsored transactions

**Trade-offs:**
1. **Complexity:** Users must understand two addresses
2. **Deployment:** Smart account needs deployment transaction
3. **Gas:** Initial deployment costs gas

## Summary

| Feature | Controller (EOA) | Smart Account (SCA) |
|---------|------------------|---------------------|
| Address | 0x98C0...760E | 0x2953...647Df |
| Type | Regular wallet | Smart contract |
| Deployment | Not needed | Required |
| Holds funds | No (in Account Kit) | Yes |
| Signs messages | Yes | Via controller |
| Used in swaps | Authorizes | Executes |
| Check on BaseScan | Less important | Primary focus |

**Remember:** In Account Kit, your **Smart Account** is your main wallet! 🎯
