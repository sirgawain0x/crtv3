import { MeTokenData, MeTokenInfo } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { publicClient } from '@/lib/viem';
import { parseAbi } from 'viem';

// Diamond contract ABI for getMeTokenInfo function
const DIAMOND_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "meToken",
        "type": "address"
      }
    ],
    "name": "getMeTokenInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "hubId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "balancePooled",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "balanceLocked",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endCooldown",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "targetHubId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "migration",
            "type": "address"
          }
        ],
        "internalType": "struct MeTokenInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

/**
 * Check if a MeToken is subscribed to a hub
 * A MeToken is considered subscribed if it has balancePooled > 0 or balanceLocked > 0
 */
export function isMeTokenSubscribed(meToken: MeTokenData | MeTokenInfo): boolean {
  const balancePooled = 'balancePooled' in meToken ? meToken.balancePooled : BigInt((meToken as MeTokenInfo).balancePooled || '0');
  const balanceLocked = 'balanceLocked' in meToken ? meToken.balanceLocked : BigInt((meToken as MeTokenInfo).balanceLocked || '0');
  
  return balancePooled > BigInt(0) || balanceLocked > BigInt(0);
}

/**
 * Check if a MeToken is NOT subscribed to a hub
 */
export function isMeTokenNotSubscribed(meToken: MeTokenData | MeTokenInfo): boolean {
  return !isMeTokenSubscribed(meToken);
}

/**
 * Get subscription status as a string
 */
export function getMeTokenSubscriptionStatus(meToken: MeTokenData | MeTokenInfo): 'subscribed' | 'not-subscribed' {
  return isMeTokenSubscribed(meToken) ? 'subscribed' : 'not-subscribed';
}

/**
 * Get detailed subscription information
 */
export function getMeTokenSubscriptionDetails(meToken: MeTokenData | MeTokenInfo) {
  const balancePooled = 'balancePooled' in meToken ? meToken.balancePooled : BigInt((meToken as MeTokenInfo).balancePooled || '0');
  const balanceLocked = 'balanceLocked' in meToken ? meToken.balanceLocked : BigInt((meToken as MeTokenInfo).balanceLocked || '0');
  const hubId = 'hubId' in meToken ? meToken.hubId : BigInt((meToken as MeTokenInfo).hubId || '0');
  
  const isSubscribed = balancePooled > BigInt(0) || balanceLocked > BigInt(0);
  
  return {
    isSubscribed,
    status: isSubscribed ? 'subscribed' : 'not-subscribed',
    balancePooled: balancePooled.toString(),
    balanceLocked: balanceLocked.toString(),
    hubId: hubId.toString(),
    totalLocked: balancePooled + balanceLocked,
    canTrade: isSubscribed,
    requiresSubscription: !isSubscribed
  };
}

/**
 * Check if a MeToken needs to be subscribed before trading
 */
export function requiresSubscriptionForTrading(meToken: MeTokenData | MeTokenInfo): boolean {
  return isMeTokenNotSubscribed(meToken);
}

/**
 * Get subscription requirements message
 */
export function getSubscriptionRequirementsMessage(meToken: MeTokenData | MeTokenInfo): string {
  if (isMeTokenSubscribed(meToken)) {
    return 'MeToken is subscribed and ready for trading.';
  }
  
  return 'MeToken must be subscribed to a hub before trading is enabled. Please subscribe your MeToken first.';
}

/**
 * Check MeToken subscription status directly from blockchain
 * @param meTokenAddress - The MeToken contract address
 * @returns Subscription status information
 */
export async function checkMeTokenSubscriptionFromBlockchain(meTokenAddress: string): Promise<{
  isSubscribed: boolean;
  status: 'subscribed' | 'not-subscribed';
  balancePooled: string;
  balanceLocked: string;
  hubId: string;
  totalLocked: string;
  canTrade: boolean;
  requiresSubscription: boolean;
  error?: string;
}> {
  try {
    console.log('🔍 Checking MeToken subscription status for:', meTokenAddress);
    
    // Try multiple approaches to get MeToken info
    const approaches = [
      // Approach 1: Use proper JSON ABI format
      async () => {
        const DIAMOND_ADDRESS = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
        
        const meTokenInfo = await publicClient.readContract({
          address: DIAMOND_ADDRESS,
          abi: DIAMOND_ABI,
          functionName: 'getMeTokenInfo',
          args: [meTokenAddress as `0x${string}`]
        });

        // Handle null case - throw error to be caught by approach loop
        if (meTokenInfo === null) {
          throw new Error('Contract returned null for MeToken info');
        }

        // Handle both struct object and tuple array formats
        // Normalize to always return a 9-element array: [owner, hubId, balancePooled, balanceLocked, startTime, endTime, endCooldown, targetHubId, migration]
        if (typeof meTokenInfo === 'object' && !Array.isArray(meTokenInfo)) {
          // Struct object format - convert to 9-element array
          // Safely access all properties with fallbacks to prevent undefined values
          const owner = meTokenInfo.owner ?? '0x0000000000000000000000000000000000000000';
          const hubId = meTokenInfo.hubId ?? BigInt(0);
          const balancePooled = meTokenInfo.balancePooled ?? BigInt(0);
          const balanceLocked = meTokenInfo.balanceLocked ?? BigInt(0);
          const startTime = meTokenInfo.startTime ?? BigInt(0);
          const endTime = meTokenInfo.endTime ?? BigInt(0);
          const endCooldown = meTokenInfo.endCooldown !== undefined && meTokenInfo.endCooldown !== null 
            ? meTokenInfo.endCooldown 
            : BigInt(0);
          const targetHubId = meTokenInfo.targetHubId ?? BigInt(0);
          const migration = meTokenInfo.migration ?? '0x0000000000000000000000000000000000000000';
          
          return [
            owner,
            hubId,
            balancePooled,
            balanceLocked,
            startTime,
            endTime,
            endCooldown, // endCooldown - safely accessed with fallback
            targetHubId,
            migration
          ];
        }
        
        // Tuple array format - normalize to 9 elements
        if (Array.isArray(meTokenInfo)) {
          // If array has 8 elements (missing endCooldown), insert it at index 6
          if (meTokenInfo.length === 8) {
            return [
              meTokenInfo[0] ?? '0x0000000000000000000000000000000000000000', // owner
              meTokenInfo[1] ?? BigInt(0), // hubId
              meTokenInfo[2] ?? BigInt(0), // balancePooled
              meTokenInfo[3] ?? BigInt(0), // balanceLocked
              meTokenInfo[4] ?? BigInt(0), // startTime
              meTokenInfo[5] ?? BigInt(0), // endTime
              BigInt(0),      // endCooldown - fallback if missing (shouldn't happen with correct ABI)
              meTokenInfo[6] ?? BigInt(0), // targetHubId
              meTokenInfo[7] ?? '0x0000000000000000000000000000000000000000'  // migration
            ];
          }
          // If already 9 elements (correct format), validate with null-safety checks and return
          if (meTokenInfo.length === 9) {
            return [
              meTokenInfo[0] ?? '0x0000000000000000000000000000000000000000', // owner
              meTokenInfo[1] ?? BigInt(0), // hubId
              meTokenInfo[2] ?? BigInt(0), // balancePooled
              meTokenInfo[3] ?? BigInt(0), // balanceLocked
              meTokenInfo[4] ?? BigInt(0), // startTime
              meTokenInfo[5] ?? BigInt(0), // endTime
              meTokenInfo[6] ?? BigInt(0), // endCooldown
              meTokenInfo[7] ?? BigInt(0), // targetHubId
              meTokenInfo[8] ?? '0x0000000000000000000000000000000000000000'  // migration
            ];
          }
          // If array has unexpected length, normalize it to 9 elements with fallbacks
          throw new Error(`Unexpected array length: ${meTokenInfo.length}. Expected 8 or 9 elements.`);
        }
        
        // If we get here, the format is unexpected - throw error
        throw new Error(`Unexpected MeToken info format: ${typeof meTokenInfo}`);
      },
      
      // Approach 2: Try getMeTokenInfo with different signature
      async () => {
        const DIAMOND_ADDRESS = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
        const DIAMOND_ABI = parseAbi([
          'function getMeTokenInfo(address) view returns (address, uint256, uint256, uint256, uint256, uint256, uint256, uint256, address)'
        ]);

        const meTokenInfo = await publicClient.readContract({
          address: DIAMOND_ADDRESS,
          abi: DIAMOND_ABI,
          functionName: 'getMeTokenInfo',
          args: [meTokenAddress as `0x${string}`]
        }) as any;

        // Handle null case - throw error to be caught by approach loop
        if (meTokenInfo === null) {
          throw new Error('Contract returned null for MeToken info');
        }

        // Normalize to 9-element array format
        // Note: Contract struct has 8 fields, but we need 9 for destructuring (includes endCooldown)
        if (Array.isArray(meTokenInfo)) {
          if (meTokenInfo.length === 8) {
            // Insert endCooldown at index 6 (after endTime, before targetHubId)
            return [
              meTokenInfo[0] ?? '0x0000000000000000000000000000000000000000', // owner
              meTokenInfo[1] ?? BigInt(0), // hubId
              meTokenInfo[2] ?? BigInt(0), // balancePooled
              meTokenInfo[3] ?? BigInt(0), // balanceLocked
              meTokenInfo[4] ?? BigInt(0), // startTime
              meTokenInfo[5] ?? BigInt(0), // endTime
              BigInt(0), // endCooldown - not in struct, insert as BigInt(0)
              meTokenInfo[6] ?? BigInt(0), // targetHubId
              meTokenInfo[7] ?? '0x0000000000000000000000000000000000000000'  // migration
            ];
          }
          // If already 9 elements, validate with null-safety checks and return
          if (meTokenInfo.length === 9) {
            return [
              meTokenInfo[0] ?? '0x0000000000000000000000000000000000000000', // owner
              meTokenInfo[1] ?? BigInt(0), // hubId
              meTokenInfo[2] ?? BigInt(0), // balancePooled
              meTokenInfo[3] ?? BigInt(0), // balanceLocked
              meTokenInfo[4] ?? BigInt(0), // startTime
              meTokenInfo[5] ?? BigInt(0), // endTime
              meTokenInfo[6] ?? BigInt(0), // endCooldown
              meTokenInfo[7] ?? BigInt(0), // targetHubId
              meTokenInfo[8] ?? '0x0000000000000000000000000000000000000000'  // migration
            ];
          }
          // If array has unexpected length, throw error
          throw new Error(`Unexpected array length: ${meTokenInfo.length}. Expected 8 or 9 elements.`);
        }
        
        // If we get here, the format is unexpected - throw error
        throw new Error(`Unexpected MeToken info format: ${typeof meTokenInfo}`);
      },
      
      // Approach 3: Try meTokenInfo function
      async () => {
        const DIAMOND_ADDRESS = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
        const DIAMOND_ABI = parseAbi([
          'function meTokenInfo(address) view returns (address, uint256, uint256, uint256, uint256, uint256, uint256, uint256, address)'
        ]);

        const meTokenInfo = await publicClient.readContract({
          address: DIAMOND_ADDRESS,
          abi: DIAMOND_ABI,
          functionName: 'meTokenInfo',
          args: [meTokenAddress as `0x${string}`]
        }) as any;

        // Handle null case - throw error to be caught by approach loop
        if (meTokenInfo === null) {
          throw new Error('Contract returned null for MeToken info');
        }

        // Normalize to 9-element array format
        // Note: Contract struct has 8 fields, but we need 9 for destructuring (includes endCooldown)
        if (Array.isArray(meTokenInfo)) {
          if (meTokenInfo.length === 8) {
            // Insert endCooldown at index 6 (after endTime, before targetHubId)
            return [
              meTokenInfo[0] ?? '0x0000000000000000000000000000000000000000', // owner
              meTokenInfo[1] ?? BigInt(0), // hubId
              meTokenInfo[2] ?? BigInt(0), // balancePooled
              meTokenInfo[3] ?? BigInt(0), // balanceLocked
              meTokenInfo[4] ?? BigInt(0), // startTime
              meTokenInfo[5] ?? BigInt(0), // endTime
              BigInt(0), // endCooldown - not in struct, insert as BigInt(0)
              meTokenInfo[6] ?? BigInt(0), // targetHubId
              meTokenInfo[7] ?? '0x0000000000000000000000000000000000000000'  // migration
            ];
          }
          // If already 9 elements, validate with null-safety checks and return
          if (meTokenInfo.length === 9) {
            return [
              meTokenInfo[0] ?? '0x0000000000000000000000000000000000000000', // owner
              meTokenInfo[1] ?? BigInt(0), // hubId
              meTokenInfo[2] ?? BigInt(0), // balancePooled
              meTokenInfo[3] ?? BigInt(0), // balanceLocked
              meTokenInfo[4] ?? BigInt(0), // startTime
              meTokenInfo[5] ?? BigInt(0), // endTime
              meTokenInfo[6] ?? BigInt(0), // endCooldown
              meTokenInfo[7] ?? BigInt(0), // targetHubId
              meTokenInfo[8] ?? '0x0000000000000000000000000000000000000000'  // migration
            ];
          }
          // If array has unexpected length, throw error
          throw new Error(`Unexpected array length: ${meTokenInfo.length}. Expected 8 or 9 elements.`);
        }
        
        // If we get here, the format is unexpected - throw error
        throw new Error(`Unexpected MeToken info format: ${typeof meTokenInfo}`);
      },
      
      // Approach 4: Fallback - Check if MeToken exists and try to get basic info
      async () => {
        console.log('🔍 Fallback approach: Checking if MeToken exists...');
        
        // Check if the MeToken contract exists
        const code = await publicClient.getCode({
          address: meTokenAddress as `0x${string}`
        });
        
        if (!code || code === '0x') {
          throw new Error('MeToken contract does not exist');
        }
        
        // Try to get basic ERC20 info as a fallback
        const ERC20_ABI = parseAbi([
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalSupply() view returns (uint256)'
        ]);
        
        const [name, symbol, totalSupply] = await Promise.all([
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
          })
        ]);
        
        // Return a fallback structure indicating we couldn't get subscription info
        return ['unknown', BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), 'unknown'];
      }
    ];

    let meTokenInfo: any = null;
    let lastError: Error | null = null;

    // Try each approach until one works
    for (let i = 0; i < approaches.length; i++) {
      try {
        console.log(`🔍 Trying approach ${i + 1}...`);
        meTokenInfo = await approaches[i]();
        console.log(`✅ Approach ${i + 1} succeeded:`, meTokenInfo);
        break;
      } catch (err) {
        console.log(`❌ Approach ${i + 1} failed:`, err instanceof Error ? err.message : 'Unknown error');
        lastError = err instanceof Error ? err : new Error('Unknown error');
        continue;
      }
    }

    // If all approaches failed, return error state
    if (!meTokenInfo) {
      console.error('❌ All approaches failed. Last error:', lastError?.message);
      return {
        isSubscribed: false,
        status: 'not-subscribed',
        balancePooled: '0',
        balanceLocked: '0',
        hubId: '0',
        totalLocked: '0',
        canTrade: false,
        requiresSubscription: true,
        error: `Unable to query MeToken info: ${lastError?.message || 'Function not available on contract'}`
      };
    }

    // Check if this is the fallback result (all zeros/unknown values)
    const isFallbackResult = meTokenInfo[1] === BigInt(0) && meTokenInfo[2] === BigInt(0) && meTokenInfo[3] === BigInt(0);
    
    if (isFallbackResult) {
      console.debug('ℹ️ Using fallback result - MeToken exists but subscription info not available via Diamond contract');
      return {
        isSubscribed: false,
        status: 'not-subscribed',
        balancePooled: '0',
        balanceLocked: '0',
        hubId: '0',
        totalLocked: '0',
        canTrade: false,
        requiresSubscription: true,
        error: 'MeToken exists but subscription status could not be determined. ' +
          'The Diamond contract function may not be available or the MeToken may not be properly registered.'
      };
    }

    // Extract values from the returned tuple
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
    ] = meTokenInfo as [string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, string];

    const isSubscribed = balancePooled > BigInt(0) || balanceLocked > BigInt(0);
    const totalLocked = balancePooled + balanceLocked;

    console.log('📊 Subscription status:', {
      isSubscribed,
      balancePooled: balancePooled.toString(),
      balanceLocked: balanceLocked.toString(),
      hubId: hubId.toString(),
      totalLocked: totalLocked.toString()
    });

    return {
      isSubscribed,
      status: isSubscribed ? 'subscribed' : 'not-subscribed',
      balancePooled: balancePooled.toString(),
      balanceLocked: balanceLocked.toString(),
      hubId: hubId.toString(),
      totalLocked: totalLocked.toString(),
      canTrade: isSubscribed,
      requiresSubscription: !isSubscribed
    };
  } catch (error) {
    console.error('❌ Failed to check MeToken subscription status:', error);
    return {
      isSubscribed: false,
      status: 'not-subscribed',
      balancePooled: '0',
      balanceLocked: '0',
      hubId: '0',
      totalLocked: '0',
      canTrade: false,
      requiresSubscription: true,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get comprehensive MeToken subscription information
 * @param meTokenAddress - The MeToken contract address
 * @returns Comprehensive subscription information including blockchain data
 */
export async function getMeTokenSubscriptionInfo(meTokenAddress: string): Promise<{
  address: string;
  subscriptionStatus: {
    isSubscribed: boolean;
    status: 'subscribed' | 'not-subscribed';
    balancePooled: string;
    balanceLocked: string;
    hubId: string;
    totalLocked: string;
    canTrade: boolean;
    requiresSubscription: boolean;
  };
  basicInfo?: {
    name: string;
    symbol: string;
    totalSupply: string;
    owner: string;
  };
  error?: string;
}> {
  try {
    console.log('🔍 Getting comprehensive MeToken subscription info for:', meTokenAddress);

    // Check subscription status from blockchain
    const subscriptionStatus = await checkMeTokenSubscriptionFromBlockchain(meTokenAddress);
    
    // Get basic token info
    let basicInfo;
    try {
      const { getMeTokenInfoFromBlockchain } = await import('@/lib/utils/metokenUtils');
      basicInfo = await getMeTokenInfoFromBlockchain(meTokenAddress);
    } catch (err) {
      console.warn('Failed to get basic MeToken info:', err);
    }

    return {
      address: meTokenAddress,
      subscriptionStatus,
      basicInfo: basicInfo || undefined,
      error: subscriptionStatus.error
    };
  } catch (error) {
    console.error('❌ Failed to get MeToken subscription info:', error);
    return {
      address: meTokenAddress,
      subscriptionStatus: {
        isSubscribed: false,
        status: 'not-subscribed',
        balancePooled: '0',
        balanceLocked: '0',
        hubId: '0',
        totalLocked: '0',
        canTrade: false,
        requiresSubscription: true
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
