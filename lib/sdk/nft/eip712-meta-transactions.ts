/**
 * EIP-712 Meta-Transaction Utilities
 * 
 * Enables gasless minting for creators by allowing them to sign messages off-chain
 * that can be executed by a relayer (platform) on-chain.
 * 
 * This complements Alchemy Account Kit's paymaster approach by providing an
 * alternative gasless transaction mechanism that doesn't require paymaster configuration.
 * 
 * Usage:
 * 1. Creator signs a meta-transaction message off-chain
 * 2. Platform (relayer) executes the signed message on-chain
 * 3. Creator gets their NFT without paying gas
 */

import { Address, encodeAbiParameters, encodeFunctionData, keccak256, toHex, type Hex } from "viem";
import { signTypedData } from "viem/actions";

/**
 * Type for Account Kit smart account client
 * Has sendCallsAsync method for executing batched transactions
 */
type AccountKitClient = {
  sendCallsAsync: (params: { calls: Array<{ to: Address; data: Hex }> }) => Promise<Hex>;
  readContract?: any; // Optional for reading contract state
};

/**
 * EIP-712 domain separator for meta-transactions
 */
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

/**
 * Meta-mint transaction parameters
 */
export interface MetaMintParams {
  to: Address;
  uri: string;
  nonce: bigint;
  deadline: bigint; // Unix timestamp
}

/**
 * Get the EIP-712 domain for a collection contract
 * 
 * IMPORTANT: The chainId is included in the domain separator to prevent cross-chain replay attacks.
 * This ensures signatures are unique per chain - a signature valid on Base cannot be replayed on
 * Story Protocol or any other chain, even if the contract address is the same.
 * 
 * The contract's EIP712 implementation (OpenZeppelin) automatically includes chainId in the
 * domain separator using block.chainid. This function must match that domain structure exactly.
 * 
 * @param collectionAddress The collection contract address
 * @param collectionName The collection name (used in domain)
 * @param chainId The chain ID (CRITICAL: Must match the chain where contract is deployed)
 * @returns EIP-712 domain with chainId for cross-chain replay protection
 */
export function getEIP712Domain(
  collectionAddress: Address,
  collectionName: string,
  chainId: number
): EIP712Domain {
  return {
    name: `${collectionName} Meta-Transaction`,
    version: "1",
    chainId, // CRITICAL: Prevents cross-chain replay attacks
    verifyingContract: collectionAddress,
  };
}

/**
 * Build the EIP-712 typed data structure for meta-mint
 * 
 * @param domain EIP-712 domain
 * @param params Meta-mint parameters
 * @returns EIP-712 typed data structure
 */
export function buildMetaMintTypedData(
  domain: EIP712Domain,
  params: MetaMintParams
) {
  return {
    domain,
    types: {
      MetaMint: [
        { name: "to", type: "address" },
        { name: "uri", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "MetaMint" as const,
    message: {
      to: params.to,
      uri: params.uri,
      nonce: params.nonce,
      deadline: params.deadline,
    },
  };
}

/**
 * Sign a meta-mint transaction
 * 
 * @param client Viem client with account (for signing)
 * @param domain EIP-712 domain
 * @param params Meta-mint parameters
 * @returns The signature
 */
export async function signMetaMint(
  client: any, // Client with account for signing (e.g., from useAccount or useWalletClient)
  domain: EIP712Domain,
  params: MetaMintParams
): Promise<Hex> {
  const typedData = buildMetaMintTypedData(domain, params);
  
  // Use viem's signTypedData - requires account in parameters
  // The client should have an account property (from useAccount, useWalletClient, etc.)
  if (client.account) {
    return await signTypedData(client, {
      ...typedData,
      account: client.account,
    });
  }
  
  // Fallback: if client has signTypedData method directly (e.g., wallet connector)
  if (typeof client.signTypedData === 'function') {
    return await client.signTypedData(typedData);
  }
  
  throw new Error("Unable to sign typed data: client must have an account property or signTypedData method");
}

/**
 * Execute a meta-mint transaction via a relayer
 * 
 * @param client Smart account client (relayer)
 * @param collectionAddress Collection contract address
 * @param params Meta-mint parameters
 * @param signature The EIP-712 signature
 * @returns Transaction hash
 */
export async function executeMetaMint(
  client: AccountKitClient,
  collectionAddress: Address,
  params: MetaMintParams,
  signature: Hex
): Promise<Hex> {
  // Calculate deadline (default to 1 hour from now if not provided)
  const deadline = params.deadline || BigInt(Math.floor(Date.now() / 1000) + 3600);
  
  // Encode the function call using encodeFunctionData
  const data = encodeFunctionData({
    abi: [
      {
        name: "metaMint",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "to", type: "address" },
          { name: "uri", type: "string" },
          { name: "deadline", type: "uint256" },
          { name: "signature", type: "bytes" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "metaMint",
    args: [params.to, params.uri, deadline, signature],
  });
  
  // Execute via Account Kit's sendCallsAsync (EIP-5792)
  // This allows the relayer to pay gas while executing the creator's signed intent
  const hash = await client.sendCallsAsync({
    calls: [
      {
        to: collectionAddress,
        data,
      },
    ],
  });
  
  return hash;
}

/**
 * Get the current nonce for a signer
 * 
 * @param client Public client for reading contract state
 * @param collectionAddress Collection contract address
 * @param signerAddress Address to get nonce for
 * @returns Current nonce value
 */
export async function getMetaMintNonce(
  client: any, // PublicClient
  collectionAddress: Address,
  signerAddress: Address
): Promise<bigint> {
  const nonce = await client.readContract({
    address: collectionAddress,
    abi: [
      {
        name: "getNonce",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "signer", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "getNonce",
    args: [signerAddress],
  });
  
  return nonce as bigint;
}

/**
 * Complete flow: Sign and execute meta-mint
 * 
 * This is a convenience function that combines signing and execution.
 * In practice, you might want to separate these steps (e.g., sign on mobile,
 * execute later via API).
 * 
 * @param signerClient Client for signing (creator's wallet)
 * @param relayerClient Client for executing (platform's smart account)
 * @param collectionAddress Collection contract address
 * @param collectionName Collection name (for EIP-712 domain)
 * @param chainId Chain ID
 * @param to Address to receive the NFT
 * @param uri Token URI (optional)
 * @returns Transaction hash
 */
export async function signAndExecuteMetaMint(
  signerClient: any,
  relayerClient: AccountKitClient,
  collectionAddress: Address,
  collectionName: string,
  chainId: number,
  to: Address,
  uri: string = ""
): Promise<Hex> {
  // Get current nonce
  const nonce = await getMetaMintNonce(
    relayerClient,
    collectionAddress,
    await signerClient.getAddresses().then((addrs: Address[]) => addrs[0])
  );
  
  // Set deadline (1 hour from now)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  
  // Build domain
  const domain = getEIP712Domain(collectionAddress, collectionName, chainId);
  
  // Sign the meta-transaction
  const signature = await signMetaMint(signerClient, domain, {
    to,
    uri,
    nonce,
    deadline,
  });
  
  // Execute via relayer
  return await executeMetaMint(relayerClient, collectionAddress, {
    to,
    uri,
    nonce,
    deadline,
  }, signature);
}

