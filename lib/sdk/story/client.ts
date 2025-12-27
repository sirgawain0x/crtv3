/**
 * Story Protocol SDK Client Setup
 * Initializes the Story Protocol client for IP Asset registration
 * 
 * Note: Story Protocol SDK bundles its own viem version, so we need to use
 * type assertions to work around version incompatibilities.
 */

import { StoryClient, StoryConfig } from "@story-protocol/core-sdk";
import { http, createPublicClient, createWalletClient } from "viem";
import { story } from "viem/chains";
import { alchemy, base } from "@account-kit/infra";
import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";

/**
 * Create a Story Protocol client instance
 * This client is used for IP Asset registration and management
 */
export function createStoryClient(
  accountAddress: Address,
  privateKey?: string,
  transport?: any // Optional transport override (e.g., for client-side signing)
): StoryClient {
  const rpcUrl = getStoryRpcUrl();
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";

  // IMPORTANT: Story Protocol only supports eth_sendRawTransaction, not eth_sendTransaction
  // This means the SDK MUST have a signer (private key or browser wallet) to:
  // 1. Create the transaction
  // 2. Sign it locally  
  // 3. Send it as a raw transaction
  // Without a signer, transactions will fail with "Unsupported method" error

  // Story Protocol client configuration
  // Use "aeneid" for testnet (chain ID 1315) or "mainnet" for mainnet (chain ID 1514)
  // Use type assertion to work around viem version incompatibility between
  // our project's viem and Story Protocol SDK's bundled viem
  
  // Create base HTTP transport
  const baseHttpTransport = http(rpcUrl);
  
  // If privateKey is provided, wrap the transport to intercept eth_sendTransaction
  // and convert it to eth_sendRawTransaction with local signing
  let storyTransport: any;
  
  if (privateKey) {
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const chainId = network === "mainnet" ? 1514 : 1315;
      
      // Define the chain configuration for reuse
      const chainConfig = {
        id: chainId,
        name: network === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)",
        nativeCurrency: {
          name: "IP",
          symbol: "IP",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [rpcUrl],
          },
        },
      } as any;
      
      // Create a wallet client with the private key for signing
      // This will be used to intercept and sign transactions
      const walletClient = createWalletClient({
        account,
        chain: chainConfig,
        transport: baseHttpTransport,
      });
      
      // Create a custom transport that intercepts eth_sendTransaction
      // and converts it to eth_sendRawTransaction with signed transaction
      // The Story Protocol SDK uses viem internally, which calls the transport's request method
      storyTransport = (opts: any) => {
        // Create the base transport with the options
        const transportInstance = baseHttpTransport(opts);
        
        // Wrap the request function to intercept eth_sendTransaction
        const originalRequest = transportInstance.request.bind(transportInstance);
        
        return {
          ...transportInstance,
          request: async (args: any) => {
            // Log all requests for debugging
            if (args.method === 'eth_sendTransaction') {
              console.log("🔄 Intercepting eth_sendTransaction, converting to signed eth_sendRawTransaction", {
                method: args.method,
                params: args.params,
              });
            }
            
            // If the method is eth_sendTransaction, convert it to eth_sendRawTransaction
            if (args.method === 'eth_sendTransaction' && args.params && args.params[0]) {
              const txParams = args.params[0];
              
              try {
                // Sign and send the transaction as a raw transaction using the wallet client
                const hash = await walletClient.sendTransaction({
                  chain: chainConfig,
                  to: txParams.to as Address,
                  data: txParams.data as `0x${string}`,
                  value: txParams.value ? BigInt(txParams.value) : undefined,
                  gas: txParams.gas ? BigInt(txParams.gas) : undefined,
                  gasPrice: txParams.gasPrice ? BigInt(txParams.gasPrice) : undefined,
                  nonce: txParams.nonce ? Number(txParams.nonce) : undefined,
                });
                
                console.log("✅ Transaction signed and sent as raw transaction:", hash);
                return hash;
              } catch (error) {
                console.error("❌ Failed to sign and send transaction:", error);
                throw error;
              }
            }
            
            // For all other methods, use the original transport
            return originalRequest(args);
          },
        };
      };
      
      console.log("✅ Created custom transport with private key signing for Story Protocol");
    } catch (error) {
      console.error("Failed to create custom transport with private key:", error);
      // Fall back to base transport
      storyTransport = baseHttpTransport;
    }
  } else {
    // No private key - use standard HTTP transport
    if (transport && typeof transport === 'function') {
      storyTransport = transport;
    } else {
      if (transport) {
        console.warn("Story Protocol: Ignoring incompatible transport, using default HTTP transport");
      }
      storyTransport = baseHttpTransport;
    }
  }

  // Verify transport is a function before passing to SDK
  if (typeof storyTransport !== 'function') {
    throw new Error(`Story Protocol transport must be a function, got ${typeof storyTransport}. RPC URL: ${rpcUrl}`);
  }

  const config: StoryConfig = {
    account: accountAddress,
    chainId: network === "testnet" ? "aeneid" : "mainnet",
    transport: storyTransport,
    // Pass private key to SDK - it should use this for signing
    ...(privateKey && { privateKey }),
  };

  try {
    const client = StoryClient.newClient(config);
    return client;
  } catch (error) {
    console.error("Failed to create Story Protocol client:", error);
    throw new Error(
      `Story Protocol client initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create a Story Protocol client for client-side operations
 * Uses Account Kit's wallet connection
 */
export function createStoryClientWithAccount(accountAddress: Address): StoryClient {
  return createStoryClient(accountAddress);
}

/**
 * Get the Story Protocol RPC URL
 * Handles both custom URLs and Alchemy endpoints
 * 
 * Note: For Story Protocol SDK transactions, we use public RPC endpoints
 * because Alchemy's Story endpoints don't support eth_sendTransaction.
 * Alchemy endpoints can still be used for read operations.
 */
export function getStoryRpcUrl(): string {
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
  const storyAlchemyKey = process.env.NEXT_PUBLIC_STORY_ALCHEMY_API_KEY;
  
  // If custom RPC URL is provided, use it
  if (process.env.NEXT_PUBLIC_STORY_RPC_URL) {
    const customUrl = process.env.NEXT_PUBLIC_STORY_RPC_URL;
    
    // Alchemy RPC works fine for read operations (getBalance, getChainId, etc.)
    // For write operations, we sign transactions locally and send as raw transactions
    // So we can use Alchemy RPC for everything
    
    // Check if the URL matches the expected network
    const isTestnetUrl = customUrl.includes('aeneid') || customUrl.includes('testnet');
    const isMainnetUrl = customUrl.includes('mainnet') || (customUrl.includes('story.foundation') && !customUrl.includes('aeneid'));
    
    if (network === "mainnet" && isTestnetUrl) {
      console.warn(`⚠️ Network mismatch: NEXT_PUBLIC_STORY_NETWORK=mainnet but RPC URL appears to be testnet: ${customUrl}`);
    } else if (network === "testnet" && isMainnetUrl) {
      console.warn(`⚠️ Network mismatch: NEXT_PUBLIC_STORY_NETWORK=testnet but RPC URL appears to be mainnet: ${customUrl}`);
    }
    
    return customUrl;
  }
  
  // Default fallback: Use Alchemy if key is available
  if (storyAlchemyKey) {
    return network === "mainnet"
      ? `https://story-mainnet.g.alchemy.com/v2/${storyAlchemyKey}`
      : `https://story-testnet.g.alchemy.com/v2/${storyAlchemyKey}`;
  }
  
  // Last resort: Try public endpoints (these may not exist or be accessible)
  // Note: rpc.story.foundation may not be available - Alchemy RPC is preferred
  console.warn("⚠️ No custom RPC URL or Alchemy key configured. Using public RPC endpoints (may not be available).");
  return network === "mainnet" 
    ? "https://rpc.story.foundation" 
    : "https://rpc.aeneid.story.foundation";
}

/**
 * Create a public client for Base chain
 * Used for reading blockchain data on Base
 */
export function createBasePublicClient() {
  return createPublicClient({
    chain: base,
    transport: alchemy({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
    }),
  });
}

/**
 * Create a public client for Story Protocol (testnet or mainnet)
 * Used for reading blockchain data on Story Protocol
 */
export function createStoryPublicClient() {
  const rpcUrl = getStoryRpcUrl();
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
  
  // Use viem's story chain for mainnet if available, otherwise define custom chain
  // Story testnet (Aeneid): Chain ID 1315
  // Story mainnet: Chain ID 1514
  if (network === "mainnet") {
    try {
      // Try to use viem's story chain definition
      return createPublicClient({
        chain: story,
        transport: http(rpcUrl),
      });
    } catch (e) {
      // Fallback to custom chain definition if story chain not available
      console.warn("viem story chain not available, using custom chain definition");
    }
  }
  
  // Custom chain definition for testnet or fallback
  const chainId = network === "mainnet" ? 1514 : 1315;
  return createPublicClient({
    transport: http(rpcUrl),
    chain: {
      id: chainId,
      name: network === "mainnet" ? "Story Mainnet" : "Story Testnet (Aeneid)",
      nativeCurrency: {
        name: "IP",
        symbol: "IP",
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: [rpcUrl],
        },
      },
    } as any, // Type assertion for viem compatibility
  });
}

/**
 * Create a wallet client for Base chain
 * Used for writing transactions on Base
 */
export function createBaseWalletClient(account: Address) {
  return createWalletClient({
    chain: base,
    transport: alchemy({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
    }),
    account: account as any, // Type assertion for viem compatibility
  });
}

/**
 * Create a wallet client for Story Protocol (testnet or mainnet)
 * Used for writing transactions on Story Protocol
 */
export function createStoryWalletClient(account: Address) {
  const rpcUrl = getStoryRpcUrl();
  const storyAlchemyKey = process.env.NEXT_PUBLIC_STORY_ALCHEMY_API_KEY;
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";

  // Use Alchemy RPC if available, otherwise use public RPC
  // Determine the correct Alchemy endpoint based on network
  let transport;
  if (storyAlchemyKey) {
    if (network === "mainnet") {
      // Story mainnet Alchemy endpoint (when available)
      transport = http(`https://story-mainnet.g.alchemy.com/v2/${storyAlchemyKey}`);
    } else {
      // Story testnet Alchemy endpoint
      transport = http(`https://story-testnet.g.alchemy.com/v2/${storyAlchemyKey}`);
    }
  } else {
    // Use public RPC (already configured for correct network via getStoryRpcUrl)
    transport = http(rpcUrl);
  }

  return createWalletClient({
    transport,
    account: account as any, // Type assertion for viem compatibility
  });
}

