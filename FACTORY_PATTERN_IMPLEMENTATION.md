# Factory Pattern Implementation Guide

## Overview

This guide explains how to use the Factory Pattern for creating creator-owned IP collections on Base chain, which can then be registered on Story Protocol.

**Infrastructure:** This implementation uses **Alchemy Account Kit** for smart account transactions, User Operations, and batching capabilities. All transactions are executed through Account Kit's smart account infrastructure.

## Two Approaches

### Approach 1: Story Protocol SPG (Current)

**Location:** `lib/sdk/story/factory-service.ts`

Uses Story Protocol's SPG (Story Protocol Gateway) to create collections:
- ✅ Works with Story Protocol out of the box
- ✅ No smart contract deployment needed
- ✅ Lower gas costs
- ❌ All collections use SPG's standard contract

**Usage:**
```typescript
import { createCreatorCollection } from "@/lib/sdk/story/factory-service";

const result = await createCreatorCollection(storyClient, {
  creatorAddress: creatorAddress,
  collectionName: "Creator Name's Videos",
  collectionSymbol: "CRTV",
});
```

### Approach 2: Custom Factory Contract (Recommended for Scale)

**Location:** `lib/sdk/story/factory-contract-service.ts`

Uses a custom Factory contract to deploy unique collections:
- ✅ Each creator gets their own contract
- ✅ Full customization and branding
- ✅ Better for creator identity
- ✅ Can batch deploy multiple collections
- ✅ CREATE2 for deterministic addresses (pre-compute before deployment)
- ❌ Requires Factory contract deployment
- ❌ Higher initial gas cost

**Usage:**

Compute address before deployment (CREATE2):
```typescript
import { computeCollectionAddress } from "@/lib/sdk/story/factory-contract-service";

// Pre-compute the collection address (no transaction needed)
const predictedAddress = await computeCollectionAddress(
  creatorAddress,
  "Creator Name's Videos",
  "CRTV"
);
console.log("Collection will be deployed at:", predictedAddress);
```

Deploy collection:
```typescript
import { deployCreatorCollection } from "@/lib/sdk/story/factory-contract-service";

const result = await deployCreatorCollection(
  smartAccountClient,
  creatorAddress,
  "Creator Name's Videos",
  "CRTV"
);
```

## Factory Contract Architecture

### Contracts

1. **CreatorIPFactory** (`contracts/CreatorIPFactory.sol`)
   - Deploys new collections for creators
   - Tracks all collections
   - Manages platform minter address

2. **CreatorIPCollection** (`contracts/CreatorIPCollection.sol`)
   - Individual NFT collection for each creator
   - Creator owns from day one
   - Supports MINTER_ROLE for platform/AI agents

### Deployment Flow

```
Platform (Factory Owner)
    ↓
computeCollectionAddress(creator, name, symbol) [Optional - CREATE2]
    ↓ (Pre-compute address for better UX)
deployCreatorCollection(creator, name, symbol)
    ↓
Factory deploys CreatorIPCollection using CREATE2
    ↓
Collection constructor sets creator as owner
    ↓
Creator owns collection from block zero
    ↓
Deployed address matches predicted address (CREATE2)
```

### CREATE2 Deterministic Addresses

The factory uses **CREATE2** for deterministic collection addresses:

**Benefits:**
- ✅ Pre-compute address before deployment
- ✅ Show address to users before transaction
- ✅ Same address across different networks (if factory address matches)
- ✅ Better UX - users know their collection address upfront

**How it works:**
1. Salt is derived from `keccak256(creator, name, symbol)`
2. Address computed as: `keccak256(0xff ++ factory ++ salt ++ initCodeHash)[12:]`
3. Same inputs always produce the same address

**Usage:**
```typescript
// Compute address before deployment
const predictedAddress = await computeCollectionAddress(
  creatorAddress,
  "My Collection",
  "MYCOL"
);

// Show to user: "Your collection will be at: 0x..."
console.log("Collection address:", predictedAddress);

// Deploy - address will match prediction
const result = await deployCreatorCollection(
  smartAccountClient,
  creatorAddress,
  "My Collection",
  "MYCOL"
);

// Verify address matches
assert(result.collectionAddress === predictedAddress);
```

## Setting Up the Factory

### 1. Deploy Factory Contract

Deploy using your preferred tool (Foundry, Hardhat, etc.):

```bash
# Using Foundry
forge create CreatorIPFactory \
  --constructor-args <platform_address> <platform_minter_address> \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY \
  --private-key $PRIVATE_KEY

# Or using Hardhat
npx hardhat run scripts/deploy-factory.js --network base
```

**Note:** Use Alchemy RPC endpoints for reliable Base chain access.

### 2. Set Environment Variable

```env
NEXT_PUBLIC_CREATOR_IP_FACTORY_ADDRESS=0x...
```

### 3. Deploy Collection for Creator

```typescript
import { deployCreatorCollection } from "@/lib/sdk/story/factory-contract-service";
import { useSmartAccountClient } from "@account-kit/react";
import type { Address } from "viem";

function CreateCollectionButton({ creatorAddress }: { creatorAddress: Address }) {
  const { client } = useSmartAccountClient({});
  
  const handleDeploy = async () => {
    if (!client) {
      console.error("Smart account client not available");
      return;
    }
    
    const result = await deployCreatorCollection(
      client,
      creatorAddress,
      "Creator Name's Videos",
      "CRTV"
    );
    
    console.log("Collection deployed:", result.collectionAddress);
  };
  
  return <button onClick={handleDeploy}>Create Collection</button>;
}
```

## Delegate Functionality (AI Agent Minting)

### Granting Minter Role to Platform

Creators can grant the platform (AI agents) permission to mint on their behalf:

```typescript
import { grantPlatformMinterRole } from "@/lib/sdk/story/factory-contract-service";

// Creator calls this to allow platform to mint
const result = await grantPlatformMinterRole(
  creatorSmartAccountClient, // Must be creator's account
  collectionAddress,
  platformMinterAddress
);
```

### Minting as Platform (AI Agent)

Once granted MINTER_ROLE, the platform can mint:

```typescript
import { mintInCreatorCollection } from "@/lib/sdk/story/factory-contract-service";

// Platform mints NFT to creator's wallet
const result = await mintInCreatorCollection(
  platformSmartAccountClient,
  collectionAddress,
  creatorAddress, // NFT goes to creator
  metadataURI
);
```

### Revoking Minter Role

Creators can revoke platform access anytime:

```typescript
// In CreatorIPCollection contract
function revokeMinterRole(address minter) external onlyOwner {
  _revokeRole(MINTER_ROLE, minter);
}
```

## Batching with Alchemy Account Kit

You can batch collection deployment + first mint in a single User Operation using Account Kit's batching capabilities:

```typescript
import { useSmartAccountClient } from "@account-kit/react";

const { client } = useSmartAccountClient({});

// Batch: Deploy collection + mint first NFT
const batch = [
  {
    target: factoryAddress,
    data: deployCollectionData,
    value: 0n,
  },
  {
    target: collectionAddress, // From first operation
    data: mintData,
    value: 0n,
  },
];

const operation = await client.sendUserOperation({
  uo: batch,
});
```

**Note:** Account Kit supports batching multiple operations into a single User Operation, reducing gas costs and improving UX.

## Integration with Story Protocol

### Registering Factory Collections on Story Protocol

Factory collections are standard ERC721 contracts, so they can be registered on Story Protocol:

```typescript
import { registerIPAsset } from "@/lib/sdk/story/ip-registration";
import { mintInCreatorCollection } from "@/lib/sdk/story/factory-contract-service";
import { useSmartAccountClient } from "@account-kit/react";

// Mint NFT in factory collection using Account Kit
const { client } = useSmartAccountClient({});
const { tokenId } = await mintInCreatorCollection(
  client,
  collectionAddress,
  creatorAddress,
  metadataURI
);

// Register on Story Protocol
const { ipId } = await registerIPAsset(
  storyClient,
  collectionAddress, // Factory collection
  tokenId,
  metadataURI
);
```

## Comparison: SPG vs Factory

| Feature | SPG (factory-service.ts) | Factory Contract |
|---------|------------------------|------------------|
| **Deployment** | No deployment needed | Requires Factory deployment |
| **Gas Cost** | Lower (uses SPG) | Higher (deploys new contract) |
| **Customization** | Limited to SPG standard | Full customization |
| **Creator Branding** | Shared SPG contract | Unique contract per creator |
| **Story Protocol** | Native integration | Standard ERC721 (works) |
| **Scalability** | Good for many creators | Best for creator identity |
| **Ownership** | Creator owns collection | Creator owns contract |

## Best Practices

1. **Use SPG for Quick Start**: Start with SPG for faster onboarding
2. **Migrate to Factory for Scale**: Use Factory when you need creator branding
3. **Grant Minter Role Selectively**: Only grant platform access if creator wants it
4. **Batch Operations**: Use Account Kit batching to reduce gas costs
5. **Store Collections**: Always store collection addresses in database
6. **Verify Ownership**: Check collection owner matches creator before operations

## Security Considerations

- **Factory Owner**: Only platform should be factory owner
- **Collection Owner**: Always verify creator is collection owner
- **Minter Role**: Creators control who can mint (platform or themselves)
- **Revocation**: Creators can revoke platform access anytime
- **No Platform Lock-in**: Creators own their contracts and can leave

## Example: Complete Flow

```typescript
import { 
  deployCreatorCollection, 
  grantPlatformMinterRole,
  mintInCreatorCollection 
} from "@/lib/sdk/story/factory-contract-service";
import { registerIPAsset } from "@/lib/sdk/story/ip-registration";
import { useSmartAccountClient } from "@account-kit/react";

// Get smart account client from Account Kit
const { client: platformClient } = useSmartAccountClient({});
const { client: creatorClient } = useSmartAccountClient({});

// 1. Deploy collection for creator (platform pays gas, creator owns)
const { collectionAddress } = await deployCreatorCollection(
  platformClient,
  creatorAddress,
  "Creator Name's Videos",
  "CRTV"
);

// 2. Creator grants platform minter role (optional - allows AI agents to mint)
await grantPlatformMinterRole(
  creatorClient, // Must be creator's account
  collectionAddress,
  platformMinterAddress
);

// 3. Platform mints NFT to creator (AI agent operation)
const { tokenId } = await mintInCreatorCollection(
  platformClient, // Platform account with MINTER_ROLE
  collectionAddress,
  creatorAddress, // NFT goes to creator
  metadataURI
);

// 4. Register on Story Protocol
const { ipId } = await registerIPAsset(
  storyClient,
  collectionAddress,
  tokenId,
  metadataURI
);

// Creator now owns:
// - The collection contract (owner)
// - The NFT (token owner)
// - The IP Asset on Story Protocol (IP owner)
```

## Conclusion

The Factory Pattern provides true creator sovereignty while allowing the platform to act as a service provider. Creators own their collections from block zero, and the platform can mint on their behalf only with explicit permission (MINTER_ROLE).

This pattern is "fair" because:
- ✅ No platform lock-in
- ✅ Legal clarity (on-chain ownership proof)
- ✅ Scalable (can onboard thousands of creators)
- ✅ Creator control (can revoke platform access)

