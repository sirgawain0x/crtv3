/**
 * NFT Minting Service
 * Handles minting ERC-721 NFTs for video assets
 * 
 * This service supports two modes:
 * 1. Base chain: Traditional ERC-721 minting (existing functionality)
 * 2. Story Protocol: Minting via SPG with automatic IP registration (new)
 * 
 * The contract address is configurable via environment variables.
 */

import type { Address, Hex } from "viem";
import { encodeFunctionData, parseAbi } from "viem";
import { publicClient } from "@/lib/viem";
import { createStoryClient } from "@/lib/sdk/story/client";
import { mintAndRegisterIp } from "@/lib/sdk/story/spg-service";
import { getOrCreateCreatorCollection } from "@/lib/sdk/story/collection-service";

// Standard ERC721 ABI for minting
const ERC721_MINT_ABI = parseAbi([
  "function safeMint(address to, string memory uri) public returns (uint256)",
  "function mint(address to, string memory uri) public returns (uint256)",
  "function mint(address to) public returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

/**
 * Mint an NFT using an ERC-721 contract
 * @param smartAccountClient - Smart account client from Account Kit
 * @param nftContractAddress - ERC-721 contract address
 * @param recipient - Address to receive the NFT
 * @param metadataURI - IPFS/URI for NFT metadata
 * @returns Mint result with token ID and transaction hash
 */
export async function mintVideoNFT(
  smartAccountClient: any, // Smart account client from Account Kit
  nftContractAddress: Address,
  recipient: Address,
  metadataURI: string
): Promise<{ tokenId: string; contractAddress: Address; txHash: string }> {
  try {
    // Get current total supply to estimate the new token ID
    // The actual token ID will be extracted from the Transfer event
    let estimatedTokenId: bigint = BigInt(0);
    try {
      const totalSupply = await publicClient.readContract({
        address: nftContractAddress,
        abi: ERC721_MINT_ABI,
        functionName: "totalSupply",
      });
      estimatedTokenId = BigInt(totalSupply as bigint);
    } catch (error) {
      console.warn("Could not read totalSupply, will extract token ID from Transfer event:", error);
    }

    // Try safeMint first (more common), fallback to mint if needed
    let mintData: Hex;
    try {
      mintData = encodeFunctionData({
        abi: ERC721_MINT_ABI,
        functionName: "safeMint",
        args: [recipient, metadataURI],
      });
    } catch {
      // Fallback to regular mint
      try {
        mintData = encodeFunctionData({
          abi: ERC721_MINT_ABI,
          functionName: "mint",
          args: [recipient, metadataURI],
        });
      } catch {
        // Fallback to mint without URI
        mintData = encodeFunctionData({
          abi: ERC721_MINT_ABI,
          functionName: "mint",
          args: [recipient],
        });
      }
    }

    // Send the mint transaction via smart account
    const operation = await smartAccountClient.sendUserOperation({
      uo: {
        target: nftContractAddress,
        data: mintData,
        value: BigInt(0),
      },
    });

    // Wait for the transaction to be mined
    const txHash = await smartAccountClient.waitForUserOperationTransaction({
      hash: operation.hash,
    });

    // Extract the actual token ID from the Transfer event in the transaction receipt
    let tokenId: bigint = estimatedTokenId;
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      // Find the Transfer event (from address zero = mint event)
      const transferEvent = receipt.logs.find((log) => {
        try {
          // Try to decode as Transfer event
          // The Transfer event signature is keccak256("Transfer(address,address,uint256)")
          // For minting, from should be address(0)
          return log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" && 
                 log.topics[1] === "0x0000000000000000000000000000000000000000000000000000000000000000";
        } catch {
          return false;
        }
      });

      if (transferEvent && transferEvent.topics[3]) {
        // Extract token ID from the third topic (indexed parameter)
        tokenId = BigInt(transferEvent.topics[3]);
      } else {
        // Fallback: try to read the token ID by checking balance change
        // This is less reliable but better than nothing
        console.warn("Could not extract token ID from Transfer event, using estimated value");
      }
    } catch (error) {
      console.warn("Could not extract token ID from receipt, using estimated value:", error);
    }

    return {
      tokenId: tokenId.toString(),
      contractAddress: nftContractAddress,
      txHash: txHash as string,
    };
  } catch (error) {
    console.error("Failed to mint NFT:", error);
    throw new Error(
      `NFT minting failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get NFT contract address from environment
 * @returns NFT contract address or null if not configured
 */
export function getNFTContractAddress(): Address | null {
  const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
  if (!address) {
    return null;
  }
  // Basic validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.warn("Invalid NFT contract address format:", address);
    return null;
  }
  return address as Address;
}

/**
 * Mint an NFT on Story Protocol using SPG (Story Protocol Gateway)
 * This mints the NFT and registers it as an IP Asset in one transaction
 * 
 * @param creatorAddress - Creator's wallet address
 * @param recipient - Address to receive the NFT
 * @param metadataURI - IPFS/URI for NFT metadata
 * @param collectionName - Optional collection name (if creating new collection)
 * @param collectionSymbol - Optional collection symbol (if creating new collection)
 * @returns Mint result with token ID, collection address, IP ID, and transaction hash
 */
export async function mintVideoNFTOnStory(
  creatorAddress: Address,
  recipient: Address,
  metadataURI: string,
  collectionName?: string,
  collectionSymbol?: string
): Promise<{
  tokenId: string;
  collectionAddress: Address;
  ipId: string;
  txHash: string;
}> {
  try {
    // Create Story Protocol client
    const storyClient = createStoryClient(creatorAddress);

    // Get or create creator's collection
    const defaultCollectionName = collectionName || `${creatorAddress.slice(0, 6)}'s Videos`;
    const defaultCollectionSymbol = collectionSymbol || "CRTV";

    const collectionAddress = await getOrCreateCreatorCollection(
      storyClient,
      creatorAddress,
      defaultCollectionName,
      defaultCollectionSymbol
    );

    // Mint and register as IP Asset in one transaction
    const result = await mintAndRegisterIp(storyClient, {
      collectionAddress,
      recipient,
      metadataURI,
      allowDuplicates: false,
    });

    return {
      tokenId: result.tokenId,
      collectionAddress,
      ipId: result.ipId,
      txHash: result.txHash,
    };
  } catch (error) {
    console.error("Failed to mint NFT on Story Protocol:", error);
    throw new Error(
      `Story Protocol NFT minting failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

