# EIP-712 Meta-Transactions Implementation

## Overview

This implementation adds EIP-712 support for gasless meta-transactions to the `CreatorIPCollection` contract. This enables creators to sign minting transactions off-chain, which can then be executed by a relayer (platform) on-chain, allowing for gasless minting.

## Architecture

### How It Works

1. **Creator Signs Off-Chain**: Creator signs an EIP-712 typed message containing:
   - Recipient address (`to`)
   - Token URI (`uri`)
   - Nonce (prevents replay attacks)
   - Deadline (expiration timestamp)

2. **Relayer Executes On-Chain**: Platform (relayer) receives the signature and executes the `metaMint` function, paying gas on behalf of the creator.

3. **Contract Verifies**: Contract verifies the signature matches the owner, checks nonce and deadline, then mints the NFT.

### Security Features

- **EIP-712 Signatures**: Type-safe, structured data signing
- **Chain ID in Domain**: Domain separator includes `chainId` to prevent cross-chain replay attacks
  - Signatures valid on Base cannot be replayed on Story Protocol or other chains
  - OpenZeppelin's EIP712 automatically includes `block.chainid` in the domain
  - TypeScript utilities must use the correct chainId when building signatures
- **Nonce Tracking**: Prevents replay attacks (each signature can only be used once per chain)
- **Deadline Enforcement**: Signatures expire after a set time
- **Owner Verification**: Only the collection owner can authorize meta-mints
- **Reentrancy Protection**: All minting functions are protected

## Contract Implementation

### New Functions

#### `metaMint(address to, string uri, uint256 deadline, bytes signature)`

Executes a meta-transaction to mint an NFT.

**Parameters:**
- `to`: Address to receive the NFT
- `uri`: Token URI (empty string if not needed)
- `deadline`: Unix timestamp after which signature expires
- `signature`: EIP-712 signature from the owner

**Returns:**
- `tokenId`: The newly minted token ID

**Requirements:**
- Signature must be valid and from the owner
- Nonce must match the signer's current nonce
- Deadline must not have passed
- `to` cannot be zero address

#### `getNonce(address signer)`

Gets the current nonce for a signer (useful for building signatures).

**Parameters:**
- `signer`: Address to get nonce for

**Returns:**
- Current nonce value

### Events

#### `MetaMintExecuted(address indexed signer, address indexed to, uint256 indexed tokenId, uint256 nonce)`

Emitted when a meta-transaction is successfully executed.

## TypeScript Integration

### Utilities

Located in `lib/sdk/nft/eip712-meta-transactions.ts`:

- `getEIP712Domain()`: Builds EIP-712 domain
- `buildMetaMintTypedData()`: Creates typed data structure
- `signMetaMint()`: Signs a meta-transaction
- `executeMetaMint()`: Executes a signed meta-transaction via relayer
- `getMetaMintNonce()`: Gets current nonce for a signer
- `signAndExecuteMetaMint()`: Complete flow (sign + execute)

### Usage Example

```typescript
import { signAndExecuteMetaMint } from "@/lib/sdk/nft/eip712-meta-transactions";
import { useSmartAccountClient } from "@account-kit/react";

// In a React component
function GaslessMintButton({ collectionAddress, collectionName, chainId }) {
  const { client: relayerClient } = useSmartAccountClient();
  const { address: creatorAddress } = useAccount();
  
  const handleGaslessMint = async () => {
    // Creator signs (could be done on mobile, separate from execution)
    const signature = await signMetaMint(creatorWallet, domain, {
      to: creatorAddress,
      uri: "ipfs://...",
      nonce: await getMetaMintNonce(publicClient, collectionAddress, creatorAddress),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour
    });
    
    // Platform executes (pays gas)
    const txHash = await executeMetaMint(
      relayerClient,
      collectionAddress,
      { to: creatorAddress, uri: "ipfs://...", nonce, deadline },
      signature
    );
    
    console.log("Gasless mint executed:", txHash);
  };
  
  return <button onClick={handleGaslessMint}>Mint (Gasless)</button>;
}
```

## Comparison with Account Kit Paymaster

| Feature | EIP-712 Meta-Transactions | Account Kit Paymaster |
|---------|---------------------------|----------------------|
| **Gas Payment** | Relayer pays | Paymaster sponsors |
| **Setup Complexity** | Medium (EIP-712 implementation) | Low (configure policy) |
| **User Experience** | Sign message, relayer executes | Standard transaction |
| **Flexibility** | Can execute later, batch signatures | Must execute immediately |
| **Cost Model** | Relayer absorbs cost | Paymaster policy limits |
| **Use Case** | One-time signatures, mobile wallets | Standard gasless UX |

### When to Use Each

**EIP-712 Meta-Transactions:**
- Creators want to sign once, execute later
- Mobile wallet integration (sign on phone, execute on server)
- Batch multiple signatures for later execution
- Custom relayer logic

**Account Kit Paymaster:**
- Standard gasless transaction flow
- Immediate execution
- Policy-based gas sponsorship
- Simpler integration

## Integration with Existing Infrastructure

### Alchemy Account Kit

The meta-transaction execution uses Account Kit's `sendCallsAsync` (EIP-5792) for batching and gas management:

```typescript
const hash = await client.sendCallsAsync({
  calls: [
    {
      to: collectionAddress,
      data: encodedMetaMintCall,
    },
  ],
});
```

This allows:
- Batching multiple meta-transactions
- Using paymaster for relayer gas sponsorship
- Atomic execution

### Story Protocol

Meta-minted NFTs are fully compatible with Story Protocol:
- Standard ERC721 tokens
- Can be registered as IP Assets
- Creator ownership maintained

## Security Considerations

1. **Chain ID Verification (CRITICAL)**:
   - **Always use the correct chainId** when building EIP-712 domains
   - The contract automatically includes `block.chainid` in the domain separator via OpenZeppelin's EIP712
   - TypeScript utilities must match this chainId exactly
   - Wrong chainId = signature will be invalid (this prevents cross-chain replay attacks)
   - Example chain IDs: Base Sepolia (84532), Base Mainnet (8453), Story Testnet (1315), Story Mainnet (1514)
   - **Why it matters**: A signature valid on Base cannot be replayed on Story Protocol or any other chain, even if the contract address is identical

2. **Nonce Management**: Frontends must track nonces correctly to prevent signature failures

3. **Deadline Enforcement**: Set reasonable deadlines (e.g., 1 hour) to prevent stale signatures

4. **Signature Storage**: Store signatures securely; they're single-use per chain

5. **Relayer Trust**: Relayer must execute honestly (signature verification prevents abuse)

6. **Replay Protection**: 
   - Nonce system prevents signature reuse on the same chain
   - ChainId in domain prevents cross-chain replay attacks
   - Combined: Signatures are single-use and chain-specific

## Future Enhancements

- **Batch Meta-Mints**: Sign multiple mints in one signature
- **Meta-Transfers**: Gasless NFT transfers
- **Meta-Role Grants**: Gasless role management
- **Multi-Sig Support**: Require multiple signatures for meta-transactions

## Testing

See `contracts/test/CreatorIPCollection.t.sol` for Foundry tests covering:
- Signature verification
- Nonce tracking
- Deadline enforcement
- Replay attack prevention

## References

- [EIP-712: Typed Structured Data Hashing and Signing](https://eips.ethereum.org/EIPS/eip-712)
- [OpenZeppelin EIP712 Documentation](https://docs.openzeppelin.com/contracts/4.x/api/utils#EIP712)
- [Alchemy Account Kit Documentation](https://accountkit.alchemy.com/)

