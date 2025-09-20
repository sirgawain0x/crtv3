import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

// MeTokenFactory ABI - we only need the MeTokenCreated event
const METOKEN_FACTORY_ABI = parseAbi([
  'event MeTokenCreated(address indexed meToken, address indexed owner, string name, string symbol)'
]);

// Create a public client for reading blockchain data
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

/**
 * Extract the MeToken contract address from a transaction hash
 * @param transactionHash - The hash of the transaction that created the MeToken
 * @returns The MeToken contract address or null if not found
 */
export async function extractMeTokenAddressFromTransaction(transactionHash: string): Promise<string | null> {
  try {
    // Get the transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`
    });

    if (!receipt) {
      console.error('No receipt found for transaction:', transactionHash);
      return null;
    }

    // First, check if the transaction created a contract (contractAddress field)
    if (receipt.contractAddress) {
      console.log('Found contract address in receipt:', receipt.contractAddress);
      return receipt.contractAddress;
    }

    // For MeTokenFactory, the contract address is returned in the transaction output
    // Let's get the transaction details to check the output
    const transaction = await publicClient.getTransaction({
      hash: transactionHash as `0x${string}`
    });

    if (transaction && transaction.to === '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B') {
      // This is a call to MeTokenFactory, let's check if we can get the return value
      try {
        // The MeTokenFactory.create function returns the deployed contract address
        // We can simulate the call to get the return value
        const result = await publicClient.call({
          to: transaction.to,
          data: transaction.input,
          from: transaction.from,
          blockNumber: receipt.blockNumber
        });

        if (result && result.data && result.data.length === 66) {
          // Extract the address from the return data (last 20 bytes)
          const contractAddress = '0x' + result.data.slice(-40);
          console.log('Found contract address in transaction output:', contractAddress);
          return contractAddress;
        }
      } catch (error) {
        console.error('Failed to get transaction output:', error);
      }
    }

    // If no contractAddress, try to find it in the logs (fallback method)
    if (receipt.logs && receipt.logs.length > 0) {
      // Look for the MeTokenCreated event in the logs
      for (const log of receipt.logs) {
        // Check if this is a MeTokenCreated event
        // The event signature hash is: 0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235
        if (log.topics[0] === '0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235') {
          // The contract address is in the first topic (indexed parameter)
          const meTokenAddress = log.topics[1];
          if (meTokenAddress) {
            // Convert from 32-byte format to 20-byte address format
            return '0x' + meTokenAddress.slice(-40);
          }
        }
      }
    }

    console.error('No contract address found in transaction receipt or logs:', transactionHash);
    return null;
  } catch (error) {
    console.error('Failed to extract MeToken address from transaction:', error);
    return null;
  }
}

/**
 * Get MeToken information from the blockchain
 * @param meTokenAddress - The MeToken contract address
 * @returns MeToken information or null if not found
 */
export async function getMeTokenInfoFromBlockchain(meTokenAddress: string): Promise<{
  name: string;
  symbol: string;
  totalSupply: string;
  owner: string;
} | null> {
  try {
    // ERC20 ABI for basic token info
    const ERC20_ABI = parseAbi([
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function totalSupply() view returns (uint256)',
      'function owner() view returns (address)'
    ]);

    // Get basic token information
    const [name, symbol, totalSupply, owner] = await Promise.all([
      publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'name'
      }),
      publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'symbol'
      }),
      publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'totalSupply'
      }),
      publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'owner'
      })
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
      totalSupply: totalSupply.toString(),
      owner: owner as string
    };
  } catch (error) {
    console.error('Failed to get MeToken info from blockchain:', error);
    return null;
  }
}

/**
 * Get MeToken protocol information from the diamond contract
 * @param meTokenAddress - The MeToken contract address
 * @returns MeToken protocol information or null if not found
 */
export async function getMeTokenProtocolInfo(meTokenAddress: string): Promise<{
  hubId: number;
  balancePooled: string;
  balanceLocked: string;
  startTime: number;
  endTime: number;
  endCooldown: number;
  targetHubId: number;
  migration: string;
} | null> {
  try {
    // Diamond contract ABI for MeToken protocol info
    const DIAMOND_ABI = parseAbi([
      'function getMeTokenInfo(address meToken) view returns (' +
        'address owner, uint256 hubId, uint256 balancePooled, uint256 balanceLocked, ' +
        'uint256 startTime, uint256 endTime, uint256 endCooldown, uint256 targetHubId, address migration)'
    ]);

    const DIAMOND_ADDRESS = '0xba5502db2aC2cBff189965e991C07109B14eB3f5'; // Base mainnet diamond

    const result = await publicClient.readContract({
      address: DIAMOND_ADDRESS,
      abi: DIAMOND_ABI,
      functionName: 'getMeTokenInfo',
      args: [meTokenAddress as `0x${string}`]
    });

    const [
      owner,
      hubId,
      balancePooled,
      balanceLocked,
      startTime,
      endTime,
      endCooldown,
      targetHubId,
      migration
    ] = result as [string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, string];

    return {
      hubId: Number(hubId),
      balancePooled: balancePooled.toString(),
      balanceLocked: balanceLocked.toString(),
      startTime: Number(startTime),
      endTime: Number(endTime),
      endCooldown: Number(endCooldown),
      targetHubId: Number(targetHubId),
      migration: migration
    };
  } catch (error) {
    console.error('Failed to get MeToken protocol info:', error);
    return null;
  }
}
