# Factory Integration Summary

This document summarizes the integration of the `CreatorIPCollectionFactory` contract into the Story Protocol pipeline.

## Overview

The factory contract (`CreatorIPCollectionFactory`) has been deployed on Story Mainnet and is now integrated into the collection creation flow. The factory uses CREATE2 for deterministic collection addresses and deploys TokenERC721 contracts (Story Protocol's NFT contract) for each creator.

## Changes Made

### 1. Updated Factory Contract Service (`lib/sdk/story/factory-contract-service.ts`)

- Updated ABI to match the new `CreatorIPCollectionFactory` interface
- Added support for `bytecode` parameter in `deployCreatorCollection`
- Updated to use TokenERC721 collection ABI (instead of custom CreatorIPCollection)
- Added functions for factory configuration and bytecode management

### 2. Created Factory Deployment API Route (`app/api/story/factory/deploy-collection/route.ts`)

- Server-side API route for factory-based collection deployment
- Requires `FACTORY_OWNER_PRIVATE_KEY` environment variable
- Handles collection deployment via factory contract

### 3. Updated Collection Service (`lib/sdk/story/collection-service.ts`)

- Modified `getOrCreateCreatorCollection` to use factory first, then fallback to SPG
- Added factory deployment logic with proper error handling
- Maintains backward compatibility with SPG-based collection creation

### 4. Updated Environment Configuration (`ENVIRONMENT_SETUP.md`)

- Added documentation for factory-related environment variables:
  - `NEXT_PUBLIC_CREATOR_IP_FACTORY_ADDRESS`
  - `FACTORY_OWNER_PRIVATE_KEY`
  - `COLLECTION_BYTECODE`

## Factory Contract Details

**Deployed Address (Mainnet):** `0xd17c79631eae76270ea2ace8d107c258dfc77397`

**Features:**
- Uses CREATE2 for deterministic collection addresses
- Deploys TokenERC721 contracts (Story Protocol's NFT contract)
- Creator owns collection from day one (set as DEFAULT_ADMIN_ROLE)
- Only factory owner can deploy collections (`onlyOwner` modifier)

## Configuration

To enable factory-based collection deployment, add these to your `.env.local`:

```bash
# Factory contract address (required for factory-based deployment)
NEXT_PUBLIC_CREATOR_IP_FACTORY_ADDRESS=0xd17c79631eae76270ea2ace8d107c258dfc77397

# Factory owner private key (server-side only, required for deployments)
FACTORY_OWNER_PRIVATE_KEY=0x...

# TokenERC721 creation bytecode (server-side only, required for deployments)
COLLECTION_BYTECODE=0x...
```

**How to get the bytecode:**
1. Compile the TokenERC721 contract using Foundry:
   ```bash
   forge build --contracts contracts/CreatorIPCollection.sol
   ```
2. Extract bytecode from: `out/CreatorIPCollection.sol/TokenERC721.json`
3. Copy the `bytecode.object` field

## Integration Flow

### Collection Creation

1. **Check Database**: First checks if creator already has a collection in the database
2. **Check On-Chain**: Verifies collection exists on-chain via factory contract
3. **Deploy via Factory** (if configured):
   - Uses factory owner's private key to deploy
   - Deploys TokenERC721 collection with creator as owner
   - Stores collection address in database
4. **Fallback to SPG** (if factory not configured or deployment fails):
   - Uses Story Protocol SPG to create collection
   - Maintains backward compatibility

### Minting and IP Registration

The minting and IP registration flow remains unchanged:
- Uses `mintAndRegisterIp` or `mintAndRegisterIpAndAttachPilTerms` from SPG service
- Works with both factory-deployed collections and SPG collections
- Creator receives NFTs via `recipient` parameter

## Benefits

1. **Deterministic Addresses**: CREATE2 allows pre-computing collection addresses
2. **Creator Ownership**: Collections are owned by creators from deployment
3. **Better UX**: Can show collection address before deployment
4. **Backward Compatible**: Falls back to SPG if factory not configured
5. **Gas Efficiency**: Factory pattern can reduce gas costs for batch deployments

## Security Considerations

- `FACTORY_OWNER_PRIVATE_KEY` is sensitive and must be kept secure
- Never commit private keys to version control
- Use secure key management in production (e.g., Vercel environment variables)
- Factory owner has full control over collection deployments

## Testing

To test the factory integration:

1. Ensure all environment variables are configured
2. Call `getOrCreateCreatorCollection` with a creator address
3. Verify collection is deployed via factory (check transaction on StoryScan)
4. Verify collection address matches computed address (CREATE2)

## Troubleshooting

### Factory deployment fails
- Check that `FACTORY_OWNER_PRIVATE_KEY` is set correctly
- Verify factory owner has sufficient balance for gas fees
- Ensure `COLLECTION_BYTECODE` matches the bytecode hash in factory contract
- Check factory contract is deployed and accessible

### Collection creation falls back to SPG
- Factory not configured: Check `NEXT_PUBLIC_CREATOR_IP_FACTORY_ADDRESS` is set
- Factory deployment failed: Check error logs for specific failure reason
- Missing bytecode: Ensure `COLLECTION_BYTECODE` is set

## Future Enhancements

- Batch deployment support for multiple creators
- Collection address pre-computation UI
- Factory ownership transfer utilities
- Collection deployment monitoring and analytics

