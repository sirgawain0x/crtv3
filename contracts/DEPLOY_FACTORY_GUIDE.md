# CreatorIPCollectionFactory Deployment Guide

This guide explains how to deploy the `CreatorIPCollectionFactory` contract to Story Protocol testnet (Aeneid) or mainnet.

## Prerequisites

1. **Foundry** (recommended) or another Solidity compiler
2. **Deployer Account** with sufficient balance for gas fees
3. **Environment Variables** configured

## Step 1: Install Foundry (if not already installed)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
forge --version
```

## Step 2: Compile the Contract

```bash
# Compile the factory contract
forge build --contracts contracts/CreatorIPCollectionFactory.sol

# Verify compilation succeeded
ls out/CreatorIPCollectionFactory.sol/CreatorIPCollectionFactory.json
```

## Step 3: Configure Environment Variables

Create or update your `.env.local` file:

```bash
# Required
DEPLOYER_PRIVATE_KEY=0x...  # Private key of deployer account (keep secure!)

# Story Protocol Network Configuration
NEXT_PUBLIC_STORY_NETWORK=testnet  # or "mainnet"
NEXT_PUBLIC_STORY_RPC_URL=https://rpc.aeneid.story.foundation  # Testnet RPC
# OR use Alchemy:
NEXT_PUBLIC_STORY_ALCHEMY_API_KEY=your_alchemy_key

# Factory Configuration (optional - defaults provided)
FACTORY_OWNER=0x...  # Address that will own the factory (defaults to deployer)
DEFAULT_CONTRACT_URI=ipfs://QmDefaultContractURI
DEFAULT_ROYALTY_RECIPIENT=0x0000000000000000000000000000000000000000  # Zero = no default royalty
DEFAULT_ROYALTY_BPS=500  # 5% (500 basis points)
DEFAULT_PLATFORM_FEE_RECIPIENT=0x...  # Platform fee recipient
DEFAULT_PLATFORM_FEE_BPS=0  # 0% platform fee
TRUSTED_FORWARDERS=0x...,0x...  # Comma-separated list (optional)
```

## Step 4: Fund Your Deployer Account

### For Testnet (Aeneid):
- Get testnet tokens from a Story Protocol testnet faucet
- You'll need enough tokens to cover gas fees (typically 0.001-0.01 tokens)

### For Mainnet:
- Ensure your deployer account has sufficient IP tokens for gas

## Step 5: Deploy the Factory

```bash
# Deploy to testnet (default)
tsx scripts/deploy-creator-ip-factory.ts

# Deploy to mainnet
NEXT_PUBLIC_STORY_NETWORK=mainnet tsx scripts/deploy-creator-ip-factory.ts
```

The script will:
1. Verify connection to Story Protocol network
2. Check deployer balance
3. Compile contract (if needed)
4. Deploy the factory contract
5. Verify deployment
6. Save deployment info to `deployments/` directory
7. Print the factory address

## Step 6: Update Environment Variables

After successful deployment, add the factory address to your `.env.local`:

```bash
NEXT_PUBLIC_CREATOR_IP_FACTORY_ADDRESS=0x...  # Factory address from deployment
```

## Deployment Output

The script creates a deployment file in `deployments/factory-{network}-{blockNumber}.json` with:
- Factory address
- Transaction hash
- Block number
- Configuration used
- Deployment timestamp

## Verification

After deployment, verify the factory:

```typescript
import { createStoryPublicClient } from "@/lib/sdk/story/client";
import { getAddress } from "viem";

const factoryAddress = process.env.NEXT_PUBLIC_CREATOR_IP_FACTORY_ADDRESS;
const publicClient = createStoryPublicClient();

// Check factory code exists
const code = await publicClient.getBytecode({ address: factoryAddress });
console.log("Factory deployed:", code !== "0x");

// Get factory owner
const owner = await publicClient.readContract({
  address: factoryAddress,
  abi: [{
    inputs: [],
    name: "owner",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function"
  }],
  functionName: "owner"
});
console.log("Factory owner:", owner);
```

## Troubleshooting

### "Contract bytecode not found"
- Ensure Foundry is installed and contract is compiled
- Or provide bytecode via `FACTORY_BYTECODE` environment variable

### "Insufficient balance"
- Fund your deployer account with testnet tokens (for testnet)
- Or ensure sufficient IP tokens for mainnet

### "Chain ID mismatch"
- Verify `NEXT_PUBLIC_STORY_NETWORK` matches your RPC URL
- Testnet should use chain ID 1315 (Aeneid)
- Mainnet should use chain ID 1514

### "Transaction failed"
- Check gas price and network congestion
- Verify deployer has sufficient balance
- Check RPC endpoint is accessible

## Next Steps

After deployment:
1. Update your application's environment variables
2. Test factory functions (deploy collection, etc.)
3. Update `factory-contract-service.ts` if needed
4. Consider verifying the contract on a block explorer

## Security Notes

- **Never commit** `.env.local` or private keys to version control
- Use a dedicated deployer account, not your main wallet
- Verify all constructor parameters before deployment
- Consider using a multisig for factory ownership on mainnet

