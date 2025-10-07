import { MeTokenData, MeTokenInfo } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { publicClient } from '@/lib/viem';
import { parseAbi } from 'viem';

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
      // Approach 1: Try getMeTokenInfo function
      async () => {
        const DIAMOND_ADDRESS = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';
        const DIAMOND_ABI = parseAbi([
          'function getMeTokenInfo(address meToken) view returns (address owner, uint256 hubId, ' +
            'uint256 balancePooled, uint256 balanceLocked, uint256 startTime, uint256 endTime, ' +
            'uint256 endCooldown, uint256 targetHubId, address migration)'
        ]);

        const meTokenInfo = await publicClient.readContract({
          address: DIAMOND_ADDRESS,
          abi: DIAMOND_ABI,
          functionName: 'getMeTokenInfo',
          args: [meTokenAddress as `0x${string}`]
        });

        return meTokenInfo;
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
        });

        return meTokenInfo;
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
        });

        return meTokenInfo;
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
      console.log('⚠️ Using fallback result - MeToken exists but subscription info not available');
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
