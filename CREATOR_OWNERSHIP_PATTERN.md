# Creator Ownership Pattern - Story Protocol Integration

## Overview

This document explains how Creative TV implements the "Sovereign Creator" pattern for Story Protocol IP registration. The platform enables creators to own their IP assets from day one, while the platform acts as a "relayer" that pays gas fees and handles minting operations.

**Infrastructure:** This implementation uses **Alchemy Account Kit** for smart account transactions, User Operations, and batching. All blockchain interactions are executed through Account Kit's smart account infrastructure on Base chain.

## Key Principles

### 1. Creator Ownership from Day One

- **Collection Ownership**: When a collection is created, the creator is set as the owner immediately
- **IP Ownership**: NFTs are minted directly to the creator's wallet using the `recipient` parameter
- **No Ownership Transfer**: No need for post-creation ownership transfers - creators own from the start

### 2. Platform as Relayer

- **Gas Payment**: Platform signs transactions and pays gas fees
- **Minting Service**: Platform can mint on behalf of creators using the `recipient` parameter
- **No IP Rights**: Platform has no ownership rights over creator IP assets

### 3. Permissionless Registration

Story Protocol's design allows this pattern:
- The `recipient` parameter in `mintAndRegisterIp` determines who receives the NFT
- The transaction signer (platform) doesn't need to own the collection or the NFT
- The collection owner (creator) is set during collection creation

## Implementation

### Collection Creation

```typescript
// Platform signs transaction, creator owns collection
const result = await createCollection(storyClient, {
  name: collectionName,
  symbol: collectionSymbol,
  owner: creatorAddress, // CRITICAL: Creator owns from day one
  mintFeeRecipient: creatorAddress, // Creator receives mint fees
});
```

**Key Points:**
- `storyClient` is configured with platform's account (signs transactions)
- `owner` parameter is set to `creatorAddress` (creator owns collection)
- These can be different addresses - platform pays gas, creator owns collection

### NFT Minting

```typescript
// Platform mints NFT directly to creator's wallet
const result = await mintAndRegisterIp(storyClient, {
  collectionAddress, // Collection owned by creator
  recipient: creatorAddress, // NFT goes to creator
  metadataURI,
});
```

**Key Points:**
- `storyClient` is signed by platform (pays gas)
- `recipient` is set to creator's address (creator receives NFT)
- Creator becomes the IP owner in Story Protocol's system

## Architecture Options

### Option 1: Using `recipient` Parameter (Current Implementation)

**How it works:**
- Platform's private key calls `mintAndRegisterIp`
- `recipient` parameter is set to creator's address
- NFT is minted directly to creator's wallet
- Creator is the IP owner

**Pros:**
- Simple implementation
- No additional transactions needed
- Works with Story Protocol's SPG out of the box

**Cons:**
- Platform must sign each mint transaction
- All creators share the same collection (if using shared collection)

### Option 2: Factory Pattern (Recommended for Scale)

**How it works:**
- Factory service creates a unique collection for each creator
- Creator is set as collection owner during creation
- Platform can mint into creator's collection using `recipient` parameter
- Each creator has their own "brand" (collection contract)

**Pros:**
- Each creator has their own collection
- Better for creator branding and identity
- Platform can still mint on behalf of creators
- True creator sovereignty

**Cons:**
- Higher initial gas cost (deploying collection per creator)
- More complex to manage multiple collections

## Code Structure

### Factory Service

Located at: `lib/sdk/story/factory-service.ts`

```typescript
// Create creator-owned collection
const result = await createCreatorCollection(storyClient, {
  creatorAddress: creatorAddress,
  collectionName: "Creator Name's Videos",
  collectionSymbol: "CRTV",
});
```

### Collection Service

Located at: `lib/sdk/story/collection-service.ts`

```typescript
// Get or create creator's collection
const collectionAddress = await getOrCreateCreatorCollection(
  storyClient,
  creatorAddress,
  collectionName,
  collectionSymbol
);
```

### Minting Service

Located at: `lib/sdk/nft/minting-service.ts`

```typescript
// Mint NFT to creator's wallet
const result = await mintVideoNFTOnStory(
  creatorAddress,
  recipient: creatorAddress, // Creator receives NFT
  metadataURI,
  collectionAddress, // Creator's collection
);
```

## Database Schema

The `creator_collections` table tracks creator-owned collections:

```sql
CREATE TABLE creator_collections (
  id UUID PRIMARY KEY,
  creator_id TEXT NOT NULL UNIQUE,
  collection_address TEXT NOT NULL UNIQUE,
  collection_name TEXT NOT NULL,
  collection_symbol TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE
);
```

## Smart Contract Factory (Implemented)

For even greater creator sovereignty, a smart contract factory has been implemented:

**Location:** 
- `contracts/CreatorIPFactory.sol` - Factory contract
- `contracts/CreatorIPCollection.sol` - Individual collection contracts
- `lib/sdk/story/factory-contract-service.ts` - TypeScript service

This factory contract:
- Deploys a new NFT collection for each creator
- Creator owns collection from block zero (set in constructor)
- Supports MINTER_ROLE for platform/AI agents (optional, creator-controlled)
- Provides on-chain verification of creator ownership
- Can batch deploy multiple collections

**See:** `FACTORY_PATTERN_IMPLEMENTATION.md` for complete setup and usage guide.

**Note:** Story Protocol uses SPG (Story Protocol Gateway) which creates collections through their pre-deployed system. The factory service (`factory-service.ts`) implements this pattern using SPG. The Factory contract approach (`factory-contract-service.ts`) provides even more creator sovereignty with custom contracts per creator.

## Best Practices

1. **Always set creator as owner**: When creating collections, always set `owner: creatorAddress`
2. **Use recipient parameter**: Always set `recipient: creatorAddress` when minting
3. **Store collections in database**: Track creator collections for fast lookups
4. **Verify on-chain**: Check collection exists on-chain before returning from database
5. **Handle race conditions**: Use database upsert with conflict handling

## Security Considerations

- **Private Keys**: Platform private keys should be stored securely (environment variables, key management services)
- **Access Control**: Only authorized platform accounts should be able to create collections
- **Collection Verification**: Always verify collections exist on-chain before trusting database records
- **RLS Policies**: Database should have Row Level Security to prevent unauthorized access

## Example Flow

1. Creator uploads video to Creative TV
2. Platform creates collection (if doesn't exist) with creator as owner
3. Platform mints NFT using `recipient: creatorAddress`
4. NFT is registered as IP Asset on Story Protocol
5. Creator owns both the NFT and the IP Asset
6. Platform has no ownership rights

## Comparison: Platform-Owned vs Creator-Owned

| Aspect | Platform-Owned | Creator-Owned (Current) |
|--------|---------------|------------------------|
| Collection Owner | Platform | Creator |
| NFT Recipient | Platform → Transfer | Creator (direct) |
| IP Owner | Platform | Creator |
| Gas Payment | Platform | Platform (relayer) |
| Creator Sovereignty | Low | High |
| Platform Control | High | Low (minting only) |

## Conclusion

The Creator Ownership Pattern ensures that creators maintain full ownership of their IP assets while benefiting from platform services. The platform acts as a relayer that pays gas fees and handles minting operations, but has no ownership rights over creator IP.

This pattern satisfies the "Fairness" requirement and provides true creator sovereignty in the Web3 ecosystem.

