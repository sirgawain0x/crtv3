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
import { serverLogger } from '@/lib/utils/logger';


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
  // If using proxy endpoint (client-side), create a custom transport
  // Otherwise, use standard HTTP transport (server-side)
  const baseHttpTransport: any = rpcUrl.startsWith('/api/')
    ? createProxyTransport(rpcUrl)
    : http(rpcUrl);
  
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
              serverLogger.debug("🔄 Intercepting eth_sendTransaction, converting to signed eth_sendRawTransaction", {
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
                
                serverLogger.debug("✅ Transaction signed and sent as raw transaction:", hash);
                return hash;
              } catch (error) {
                serverLogger.error("❌ Failed to sign and send transaction:", error);
                throw error;
              }
            }
            
            // For all other methods, wrap with error handling to catch RPC errors
            try {
              const result = await originalRequest(args);
              return result;
            } catch (error: any) {
              // Enhanced error handling for RPC errors
              if (error && typeof error === 'object') {
                // Check for JSON parsing errors
                if (error.message && (error.message.includes('Unexpected token') || error.message.includes('is not valid JSON'))) {
                  serverLogger.error("❌ RPC returned non-JSON response:", {
                    method: args.method,
                    url: rpcUrl,
                    error: error.message,
                  });
                  
                  // Try to extract more information from the error
                  const enhancedError = new Error(
                    `RPC endpoint returned invalid JSON response. ` +
                    `Method: ${args.method}, URL: ${rpcUrl}. ` +
                    `This may indicate the RPC endpoint is down, returning an error page, or the API key is invalid. ` +
                    `Original error: ${error.message}`
                  );
                  (enhancedError as any).cause = error;
                  throw enhancedError;
                }
                
                // Check for HTTP errors
                if (error.message && error.message.includes('HTTP request failed')) {
                  serverLogger.error("❌ HTTP request failed:", {
                    method: args.method,
                    url: rpcUrl,
                    error: error.message,
                  });
                  
                  const enhancedError = new Error(
                    `HTTP request to RPC endpoint failed. ` +
                    `Method: ${args.method}, URL: ${rpcUrl}. ` +
                    `Check your network connection and RPC endpoint configuration. ` +
                    `Original error: ${error.message}`
                  );
                  (enhancedError as any).cause = error;
                  throw enhancedError;
                }
              }
              
              // Re-throw the original error if we can't enhance it
              throw error;
            }
          },
        };
      };
      
      serverLogger.debug("✅ Created custom transport with private key signing for Story Protocol");
    } catch (error) {
      serverLogger.error("Failed to create custom transport with private key:", error);
      // Fall back to base transport
      storyTransport = baseHttpTransport;
    }
  } else {
    // No private key - use standard HTTP transport with error handling
    if (transport && typeof transport === 'function') {
      storyTransport = transport;
    } else {
      if (transport) {
        serverLogger.warn("Story Protocol: Ignoring incompatible transport, using default HTTP transport");
      }
      
      // Wrap the base transport with error handling
      storyTransport = (opts: any) => {
        const transportInstance = baseHttpTransport(opts);
        const originalRequest = transportInstance.request?.bind(transportInstance) || transportInstance.request;
        
        return {
          ...transportInstance,
          request: async (args: any) => {
            try {
              const result = await originalRequest(args);
              return result;
            } catch (error: any) {
              // Enhanced error handling for RPC errors
              if (error && typeof error === 'object') {
                // Check for JSON parsing errors
                if (error.message && (error.message.includes('Unexpected token') || error.message.includes('is not valid JSON'))) {
                  serverLogger.error("❌ RPC returned non-JSON response:", {
                    method: args.method,
                    url: rpcUrl,
                    error: error.message,
                  });
                  
                  const enhancedError = new Error(
                    `RPC endpoint returned invalid JSON response. ` +
                    `Method: ${args.method}, URL: ${rpcUrl}. ` +
                    `This may indicate the RPC endpoint is down, returning an error page, or the API key is invalid. ` +
                    `Original error: ${error.message}`
                  );
                  (enhancedError as any).cause = error;
                  throw enhancedError;
                }
                
                // Check for HTTP errors
                if (error.message && error.message.includes('HTTP request failed')) {
                  serverLogger.error("❌ HTTP request failed:", {
                    method: args.method,
                    url: rpcUrl,
                    error: error.message,
                  });
                  
                  const enhancedError = new Error(
                    `HTTP request to RPC endpoint failed. ` +
                    `Method: ${args.method}, URL: ${rpcUrl}. ` +
                    `Check your network connection and RPC endpoint configuration. ` +
                    `Original error: ${error.message}`
                  );
                  (enhancedError as any).cause = error;
                  throw enhancedError;
                }
              }
              
              // Re-throw the original error if we can't enhance it
              throw error;
            }
          },
        };
      };
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
    serverLogger.error("Failed to create Story Protocol client:", error);
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
 * Check if code is running server-side
 */
function isServerSide(): boolean {
  return typeof window === 'undefined';
}

/**
 * Get the Story Protocol RPC URL for server-side operations
 * Uses server-only environment variables to keep API keys secure
 */
export function getStoryRpcUrl(): string {
  const network = process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet";
  
  // For server-side: Use server-only environment variables (no NEXT_PUBLIC_ prefix)
  // This keeps API keys secure and not exposed to the client
  if (isServerSide()) {
    // Check for server-only custom RPC URL first
    if (process.env.STORY_RPC_URL) {
      return process.env.STORY_RPC_URL;
    }
    
    // Use server-only Alchemy API key
    const serverAlchemyKey = process.env.STORY_ALCHEMY_API_KEY;
    if (serverAlchemyKey) {
      return network === "mainnet"
        ? `https://story-mainnet.g.alchemy.com/v2/${serverAlchemyKey}`
        : `https://story-testnet.g.alchemy.com/v2/${serverAlchemyKey}`;
    }
  }
  
  // For client-side OR fallback: Use proxy endpoint or public RPC
  // Client-side code should use the proxy to avoid exposing API keys
  if (!isServerSide()) {
    // Use the RPC proxy endpoint for client-side operations
    // This keeps the API key secure on the server
    return "/api/story/rpc-proxy";
  }
  
  // Server-side fallback: Try public endpoints
  // Note: rpc.story.foundation may not be available - Alchemy RPC is preferred
  if (isServerSide()) {
    serverLogger.warn("⚠️ No STORY_ALCHEMY_API_KEY or STORY_RPC_URL configured. Using public RPC endpoints (may not be available).");
  }
  
  return network === "mainnet" 
    ? "https://rpc.story.foundation" 
    : "https://rpc.aeneid.story.foundation";
}

/**
 * Create a custom HTTP transport that uses the proxy for client-side operations
 * This ensures API keys are never exposed to the browser
 * 
 * The proxy endpoint expects JSON-RPC 2.0 format:
 * { jsonrpc: "2.0", method: string, params: array, id: number }
 */
function createProxyTransport(proxyUrl: string) {
  // Return a transport function that matches viem's transport interface
  return (opts: any) => {
    // Create a base HTTP transport to get the proper config structure
    // We'll use a dummy URL since we're overriding the request method
    const baseTransport = http('http://localhost')(opts);
    
    return {
      ...baseTransport,
      request: async (args: any) => {
        // Extract method and params from viem's request format
        const method = args.method || (args as any).method;
        const params = args.params !== undefined ? args.params : (args as any).params || [];
        
        // Create JSON-RPC 2.0 request
        const jsonRpcRequest = {
          jsonrpc: "2.0",
          method,
          params: Array.isArray(params) ? params : [params],
          id: Math.floor(Math.random() * 1000000),
        };
        
        try {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(jsonRpcRequest),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText };
            }
            throw new Error(`RPC proxy error (${response.status}): ${errorData.error?.message || errorData.error || response.statusText}`);
          }
          
          const data = await response.json();
          
          // Handle JSON-RPC error responses
          if (data.error) {
            const errorMessage = data.error.message || JSON.stringify(data.error);
            throw new Error(`RPC error: ${errorMessage}`);
          }
          
          // Return the result
          return data.result;
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error(`Failed to call RPC proxy: ${String(error)}`);
        }
      },
    };
  };
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
      serverLogger.warn("viem story chain not available, using custom chain definition");
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

