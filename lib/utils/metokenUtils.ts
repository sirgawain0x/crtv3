import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

// MeTokenFactory ABI - we only need the MeTokenCreated event
const METOKEN_FACTORY_ABI = parseAbi([
  'event MeTokenCreated(address indexed meToken, address indexed owner, string name, string symbol)'
]);

const METOKEN_FACTORY_ADDRESS = '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B';

// Create a public client for reading blockchain data
const publicClient = createPublicClient({
  chain: base,
  transport: http(undefined, {
    fetchOptions: {
      headers: {
        "Accept-Encoding": "gzip",
      },
    },
  }),
});

/**
 * Get the return value from a transaction (works for successful state-changing calls)
 * @param transactionHash - The transaction hash
 * @returns The decoded return value or null
 */
export async function getTransactionReturnValue(transactionHash: string): Promise<string | null> {
  try {
    const tx = await publicClient.getTransaction({ hash: transactionHash as `0x${string}` });
    const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash as `0x${string}` });
    
    if (!tx || !receipt || receipt.status !== 'success') {
      return null;
    }
    
    // Simulate the call at the block it was mined to get the return value
    try {
      const result = await publicClient.call({
        to: tx.to!,
        data: tx.input,
        blockNumber: receipt.blockNumber
      });
      
      if (result.data && result.data.length === 66) {
        // 0x + 64 chars = address (with leading zeros)
        const address = '0x' + result.data.slice(-40);
        console.log('✅ Extracted address from return value:', address);
        return address;
      }
    } catch (error) {
      console.warn('Could not simulate call:', error);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting transaction return value:', error);
    return null;
  }
}

/**
 * Extract the MeToken contract address from a transaction hash
 * @param transactionHash - The hash of the transaction that created the MeToken
 * @returns The MeToken contract address or null if not found
 */
export async function extractMeTokenAddressFromTransaction(transactionHash: string): Promise<string | null> {
  try {
    console.log('🔍 Extracting MeToken address from transaction:', transactionHash);
    
    // First try to get the return value directly
    const returnValue = await getTransactionReturnValue(transactionHash);
    if (returnValue) {
      console.log('✅ Found MeToken address from return value:', returnValue);
      return returnValue;
    }
    
    // Get the transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`
    });

    if (!receipt) {
      console.error('No receipt found for transaction:', transactionHash);
      return null;
    }

    console.log('📋 Receipt logs count:', receipt.logs.length);

    // First, check if the transaction created a contract (contractAddress field)
    if (receipt.contractAddress) {
      console.log('✅ Found contract address in receipt:', receipt.contractAddress);
      return receipt.contractAddress;
    }

    // For UserOperations and smart account transactions, we need to parse all logs
    // Look for any contract creation events
    if (receipt.logs && receipt.logs.length > 0) {
      console.log('🔎 Searching through', receipt.logs.length, 'logs...');
      
      for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        console.log(`Log ${i}:`, {
          address: log.address,
          topics: log.topics,
          data: log.data
        });
        
        // Check if this is a MeTokenCreated event
        // Event signature: MeTokenCreated(address indexed meToken, address indexed owner, string name, string symbol)
        // Keccak256 hash: 0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235
        if (log.topics[0] === '0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235') {
          // The contract address is in the first indexed topic (meToken)
          const meTokenAddress = log.topics[1];
          if (meTokenAddress) {
            // Convert from 32-byte format to 20-byte address format
            const address = '0x' + meTokenAddress.slice(-40);
            console.log('✅ Found MeToken address in MeTokenCreated event:', address);
            return address;
          }
        }
      }
      
      // Also check for generic contract creation patterns
      // Look for logs from the MeTokenFactory contract
      const METOKEN_FACTORY = '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B';
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === METOKEN_FACTORY.toLowerCase()) {
          console.log('📍 Found log from MeTokenFactory:', log);
          // If there's any topic with an address, it might be the deployed contract
          for (let i = 1; i < log.topics.length; i++) {
            const topic = log.topics[i];
            if (topic && topic.length === 66) { // 0x + 64 chars = address in 32 bytes
              const potentialAddress = '0x' + topic.slice(-40);
              console.log('🤔 Potential contract address from topic:', potentialAddress);
              // We'll return the first one we find from the factory
              return potentialAddress;
            }
          }
        }
      }
    }

    console.error('❌ No contract address found in transaction receipt or logs:', transactionHash);
    console.log('Full receipt:', JSON.stringify(receipt, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    return null;
  } catch (error) {
    console.error('Failed to extract MeToken address from transaction:', error);
    return null;
  }
}

/**
 * Get the most recent MeToken created by an owner
 * @param ownerAddress - The address of the MeToken owner
 * @returns The MeToken address or null if not found
 */
export async function getLatestMeTokenByOwner(ownerAddress: string): Promise<string | null> {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔎 Searching for MeTokens created by: ${ownerAddress} (attempt ${attempt + 1}/${maxRetries})`);
      
      // Get the current block
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - 10000n; // Search last ~10k blocks (~2 hours on Base)
      
      console.log(`📊 Searching blocks ${fromBlock} to ${currentBlock}`);
      
      // First, query ALL MeTokenCreated events to see if any were created
      const allLogs = await publicClient.getLogs({
        address: METOKEN_FACTORY_ADDRESS as `0x${string}`,
        event: METOKEN_FACTORY_ABI[0],
        fromBlock,
        toBlock: currentBlock
      });
      
      console.log(`📊 Total MeTokenCreated events in range: ${allLogs.length}`);
      if (allLogs.length > 0) {
        console.log('Recent events:', allLogs.slice(-3).map(log => ({
          meToken: log.args.meToken,
          owner: log.args.owner,
          block: log.blockNumber
        })));
      }
      
      // Query MeTokenCreated events for this specific owner
      const logs = await publicClient.getLogs({
        address: METOKEN_FACTORY_ADDRESS as `0x${string}`,
        event: METOKEN_FACTORY_ABI[0],
        args: {
          owner: ownerAddress as `0x${string}`
        },
        fromBlock,
        toBlock: currentBlock
      });
      
      console.log(`📋 Found ${logs.length} MeToken creation events for owner ${ownerAddress}`);
      
      if (logs.length > 0) {
        // Get the most recent one
        const latestLog = logs[logs.length - 1];
        const meTokenAddress = latestLog.args.meToken as string;
        console.log('✅ Latest MeToken address:', meTokenAddress);
        return meTokenAddress;
      }
      
      console.log('⚠️ No MeTokens found for this owner');
      return null;
    } catch (error) {
      const isAbortError = error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'));
      
      if (isAbortError && attempt < maxRetries - 1) {
        console.warn(`⏱️ Request aborted, retrying... (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      console.error('Failed to get latest MeToken:', error);
      return null;
    }
  }
  
  return null;
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
    console.log('🔍 Getting MeToken info for:', meTokenAddress);
    
    // ERC20 ABI for basic token info
    const ERC20_ABI = parseAbi([
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function totalSupply() view returns (uint256)'
    ]);

    // Get MeToken protocol info from Diamond contract
    const DIAMOND_ADDRESS = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
    const DIAMOND_ABI = parseAbi([
      'function getMeTokenInfo(address meToken) view returns (address owner, uint256 hubId, ' +
        'uint256 balancePooled, uint256 balanceLocked, uint256 startTime, uint256 endTime, ' +
        'uint256 endCooldown, uint256 targetHubId, address migration)'
    ]);

    // Get basic token information and owner from Diamond - try one at a time to see which fails
    let name, symbol, totalSupply, meTokenInfo;
    
    try {
      console.log('📝 Fetching name...');
      name = await publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'name'
      });
      console.log('✅ Name:', name);
    } catch (err) {
      console.error('❌ Failed to get name:', err);
      throw new Error('Failed to get MeToken name: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    
    try {
      console.log('🔤 Fetching symbol...');
      symbol = await publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'symbol'
      });
      console.log('✅ Symbol:', symbol);
    } catch (err) {
      console.error('❌ Failed to get symbol:', err);
      throw new Error('Failed to get MeToken symbol: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    
    try {
      console.log('💰 Fetching totalSupply...');
      totalSupply = await publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'totalSupply'
      });
      console.log('✅ TotalSupply:', totalSupply);
    } catch (err) {
      console.error('❌ Failed to get totalSupply:', err);
      throw new Error('Failed to get MeToken totalSupply: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    
    try {
      console.log('👤 Fetching getMeTokenInfo from Diamond...');
      meTokenInfo = await publicClient.readContract({
        address: DIAMOND_ADDRESS,
        abi: DIAMOND_ABI,
        functionName: 'getMeTokenInfo',
        args: [meTokenAddress as `0x${string}`]
      });
      console.log('✅ MeTokenInfo:', meTokenInfo);
    } catch (err) {
      console.error('❌ Failed to get getMeTokenInfo:', err);
      throw new Error('Failed to get MeToken info from Diamond: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }

    // Extract owner from the MeTokenInfo tuple (first element)
    const owner = (meTokenInfo as any[])[0] as string;
    console.log('👤 Owner:', owner);

    return {
      name: name as string,
      symbol: symbol as string,
      totalSupply: totalSupply.toString(),
      owner: owner
    };
  } catch (error) {
    console.error('❌ Failed to get MeToken info from blockchain:', error);
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
