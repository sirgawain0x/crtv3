# EIP-2981 Royalty Standard Implementation

## Overview

The `CreatorIPCollection` contract implements EIP-2981 (NFT Royalty Standard), enabling creators to earn royalties on secondary sales of their NFTs. This standard is supported by major NFT marketplaces including OpenSea, Blur, LooksRare, and others.

## Features

### Default Collection Royalty

- **Default Rate**: 5% (500 basis points) on all tokens
- **Recipient**: Collection owner (creator) by default
- **Configurable**: Owner can update default royalty via `setDefaultRoyalty()`

### Per-Token Royalty Overrides

- **Optional**: Individual tokens can have custom royalty rates
- **Flexible**: Different tokens can have different royalty recipients
- **Removable**: Setting recipient to zero address reverts to default

### Marketplace Compatibility

- **OpenSea**: Automatically detects and respects EIP-2981 royalties
- **Blur**: Supports EIP-2981 for royalty payments
- **LooksRare**: Native EIP-2981 support
- **Other Marketplaces**: Any marketplace implementing EIP-2981 will work

## Contract Functions

### `royaltyInfo(uint256 tokenId, uint256 salePrice)`

EIP-2981 standard function that returns royalty information.

**Parameters:**
- `tokenId`: The token ID
- `salePrice`: The sale price of the token

**Returns:**
- `recipient`: Address to receive royalties
- `royaltyAmount`: Royalty amount in same currency as salePrice

**Behavior:**
- Returns token-specific royalty if set
- Falls back to default collection royalty
- Calculates royalty as: `(salePrice * bps) / 10000`

### `setDefaultRoyalty(address recipient, uint96 bps)`

Set the default royalty for the entire collection.

**Parameters:**
- `recipient`: Address to receive royalties
- `bps`: Royalty percentage in basis points (500 = 5%, max 10000 = 100%)

**Requirements:**
- Caller must be owner
- `recipient` cannot be zero address
- `bps` cannot exceed 10000

**Effects:**
- Updates default royalty for all tokens without overrides
- Emits `DefaultRoyaltyUpdated` event

### `setTokenRoyalty(uint256 tokenId, address recipient, uint96 bps)`

Set royalty for a specific token (overrides default).

**Parameters:**
- `tokenId`: The token ID
- `recipient`: Address to receive royalties (zero address to remove override)
- `bps`: Royalty percentage in basis points

**Requirements:**
- Caller must be owner
- Token must exist
- `bps` cannot exceed 10000

**Effects:**
- Sets token-specific royalty override
- Setting `recipient` to zero address removes override (reverts to default)
- Emits `TokenRoyaltyUpdated` event

### `getDefaultRoyalty()`

View function to get default royalty information.

**Returns:**
- `recipient`: Default royalty recipient
- `bps`: Default royalty percentage in basis points

### `getTokenRoyalty(uint256 tokenId)`

View function to get token-specific royalty information.

**Returns:**
- `recipient`: Token-specific royalty recipient (zero if using default)
- `bps`: Token-specific royalty percentage in basis points

## Events

### `DefaultRoyaltyUpdated(address indexed recipient, uint96 bps)`

Emitted when default collection royalty is updated.

### `TokenRoyaltyUpdated(uint256 indexed tokenId, address indexed recipient, uint96 bps)`

Emitted when token-specific royalty is set or removed.

## Usage Examples

### Setting Default Royalty

```solidity
// Set 7.5% default royalty to creator
collection.setDefaultRoyalty(creatorAddress, 750);
```

### Setting Per-Token Royalty

```solidity
// Set 10% royalty for token #1 to a specific address
collection.setTokenRoyalty(1, royaltyRecipient, 1000);

// Remove token-specific royalty (revert to default)
collection.setTokenRoyalty(1, address(0), 0);
```

### Querying Royalty Information

```solidity
// Get royalty for a token sale
(uint256 royaltyAmount, address recipient) = collection.royaltyInfo(
    tokenId,
    salePrice
);
```

## Integration with Story Protocol

EIP-2981 royalties work independently of Story Protocol's licensing system:

- **EIP-2981**: Handles marketplace royalties on secondary sales
- **Story Protocol PIL**: Handles licensing terms and commercial use fees

Both systems can coexist:
- Creators earn royalties on secondary sales (EIP-2981)
- Creators can also set licensing terms for commercial use (Story Protocol)

## Basis Points Reference

| Percentage | Basis Points |
|------------|--------------|
| 1%         | 100          |
| 2.5%       | 250          |
| 5%         | 500          |
| 7.5%       | 750          |
| 10%        | 1000         |
| 15%        | 1500         |
| 20%        | 2000         |
| 100%       | 10000        |

## Security Considerations

1. **Maximum Royalty**: Enforced at 100% (10000 bps) to prevent errors
2. **Zero Address Checks**: Prevents setting invalid recipients
3. **Owner-Only**: Only collection owner can set royalties
4. **Token Existence**: Per-token royalties require token to exist

## Gas Costs

- `setDefaultRoyalty`: ~45,000 gas
- `setTokenRoyalty`: ~50,000 gas
- `royaltyInfo`: View function (no gas)
- `getDefaultRoyalty`: View function (no gas)
- `getTokenRoyalty`: View function (no gas)

## Testing

See `contracts/test/CreatorIPCollection.t.sol` for Foundry tests covering:
- Default royalty setting and retrieval
- Per-token royalty overrides
- Royalty calculation accuracy
- Edge cases (zero address, max bps, non-existent tokens)

## References

- [EIP-2981: NFT Royalty Standard](https://eips.ethereum.org/EIPS/eip-2981)
- [OpenZeppelin IERC2981 Documentation](https://docs.openzeppelin.com/contracts/4.x/api/interfaces#IERC2981)
- [OpenSea Royalty Documentation](https://docs.opensea.io/docs/4-royalties)

