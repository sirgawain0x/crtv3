
import { logger } from '@/lib/utils/logger';
/**
 * Bundler Simulation Utilities
 * Use Alchemy's simulation APIs to validate UserOperations before sending
 */

/**
 * Simulate a UserOperation and return asset changes
 * This helps catch errors before actually sending the transaction
 */
export async function simulateUserOperationAssetChanges(
  userOp: any,
  entryPoint: string,
  apiKey: string,
  blockNumber?: string
): Promise<{
  changes: Array<{
    assetType: 'NATIVE' | 'ERC20' | 'ERC721' | 'ERC1155' | 'SPECIAL_NFT';
    changeType: 'APPROVE' | 'TRANSFER';
    from: string;
    to: string;
    amount: string;
    symbol: string;
    contractAddress?: string;
  }>;
  error?: {
    message: string;
    revertReason?: string;
  };
}> {
  const network = apiKey.includes('base') ? 'base-mainnet' : 'eth-mainnet';
  const url = `https://${network}.g.alchemy.com/v2/${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_simulateUserOperationAssetChanges',
        params: [
          userOp,
          entryPoint,
          blockNumber || 'latest',
        ],
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Simulation API error: ${data.error.message}`);
    }
    
    return data.result;
  } catch (error) {
    logger.error('Failed to simulate UserOperation:', error);
    throw error;
  }
}

/**
 * Get optimal priority fee from bundler
 */
export async function getOptimalPriorityFee(
  apiKey: string
): Promise<bigint> {
  const network = apiKey.includes('base') ? 'base-mainnet' : 'eth-mainnet';
  const url = `https://${network}.g.alchemy.com/v2/${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'rundler_maxPriorityFeePerGas',
        params: [],
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      logger.warn('Failed to get optimal priority fee, using default');
      return BigInt(0); // Fallback to 0
    }
    
    return BigInt(data.result);
  } catch (error) {
    logger.warn('Failed to get optimal priority fee:', error);
    return BigInt(0); // Fallback to 0
  }
}

/**
 * Get current nonce from EntryPoint
 */
export async function getEntryPointNonce(
  client: any,
  entryPointAddress: string
): Promise<bigint> {
  try {
    const nonce = await client.readContract({
      address: entryPointAddress as `0x${string}`,
      abi: [
        {
          inputs: [{ name: 'sender', type: 'address' }],
          name: 'getNonce',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ] as const,
      functionName: 'getNonce',
      args: [client.account?.address as `0x${string}`],
    });
    
    return nonce as bigint;
  } catch (error) {
    logger.error('Failed to get EntryPoint nonce:', error);
    throw error;
  }
}

