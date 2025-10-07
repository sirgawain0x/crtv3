import { formatEther } from 'viem';
import { publicClient } from '@/lib/viem';
import { parseAbi } from 'viem';

// Official MeTokens Protocol Contract Addresses
export const METOKEN_CONTRACTS = {
  // Base Mainnet
  BASE: {
    DIAMOND: '0xba5502db2aC2cBff189965e991C07109B14eB3f5',
    FACTORY: '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B',
    DAI: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb'
  },
  // Mainnet
  MAINNET: {
    DIAMOND: '0x0B4ec400e8D10218D0869a5b0036eA4BCf92d905',
    FACTORY: '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  },
  // Optimism
  OPTIMISM: {
    DIAMOND: '0xdD830E2cdC4023d1744232a403Cf2F6c84e898D1',
    FACTORY: '0x7BE650f4AA109377c1bBbEE0851CF72A8e7E915C',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  }
} as const;

// Universal Diamond ABI (from official documentation)
export const DIAMOND_ABI = parseAbi([
  'function getMeTokenInfo(address meToken) view returns (address owner, uint256 hubId, uint256 balancePooled, uint256 balanceLocked, uint256 startTime, uint256 endTime, uint256 endCooldown, uint256 targetHubId, address migration)',
  'function getHubInfo(uint256 hubId) view returns (tuple(uint256 startTime, uint256 endTime, uint256 endCooldown, uint256 refundRatio, uint256 targetRefundRatio, address owner, address vault, address asset, bool updating, bool reconfigure, bool active) hubInfo)',
  'function subscribe(string name, string symbol, uint256 hubId, uint256 assetsDeposited)',
  'function calculateMeTokensMinted(address meToken, uint256 assetsDeposited) view returns (uint256 meTokensMinted)',
  'function calculateAssetsReturned(address meToken, uint256 meTokensBurned) view returns (uint256 assetsReturned)'
]);

// ERC20 ABI for MeToken contracts
export const METOKEN_ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
]);

/**
 * Check MeToken subscription status using the official Diamond Standard approach
 */
export async function checkMeTokenSubscriptionStatus(
  meTokenAddress: string,
  network: keyof typeof METOKEN_CONTRACTS = 'BASE'
) {
  console.log(`\n🔍 Checking MeToken subscription status using Diamond Standard...`);
  console.log(`📍 MeToken Address: ${meTokenAddress}`);
  console.log(`🌐 Network: ${network}`);
  console.log(`💎 Diamond Contract: ${METOKEN_CONTRACTS[network].DIAMOND}\n`);

  try {
    // Step 1: Get MeToken info from Diamond contract
    console.log(`📊 Querying Diamond contract for MeToken info...`);
    const meTokenInfo = await publicClient.readContract({
      address: METOKEN_CONTRACTS[network].DIAMOND,
      abi: DIAMOND_ABI,
      functionName: 'getMeTokenInfo',
      args: [meTokenAddress as `0x${string}`]
    });

    console.log(`✅ MeToken info retrieved:`, meTokenInfo);

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

    // Step 2: Get basic ERC20 info from MeToken contract
    console.log(`📝 Getting ERC20 token information...`);
    const [name, symbol, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: METOKEN_ERC20_ABI,
        functionName: 'name'
      }),
      publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: METOKEN_ERC20_ABI,
        functionName: 'symbol'
      }),
      publicClient.readContract({
        address: meTokenAddress as `0x${string}`,
        abi: METOKEN_ERC20_ABI,
        functionName: 'totalSupply'
      })
    ]);

    // Step 3: Determine subscription status
    const isSubscribed = balancePooled > BigInt(0) || balanceLocked > BigInt(0);
    const totalLocked = balancePooled + balanceLocked;

    console.log(`\n📊 MeToken Information:`);
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Total Supply: ${formatEther(totalSupply)} tokens`);
    
    console.log(`\n🔗 Subscription Status:`);
    console.log(`   Status: ${isSubscribed ? '✅ Subscribed' : '❌ Not Subscribed'}`);
    console.log(`   Hub ID: ${hubId.toString()}`);
    
    if (isSubscribed) {
      console.log(`   📈 Pooled Balance: ${formatEther(balancePooled)} DAI`);
      console.log(`   🔒 Locked Balance: ${formatEther(balanceLocked)} DAI`);
      console.log(`   💰 Total Locked: ${formatEther(totalLocked)} DAI`);
      
      // Step 4: Calculate TVL (Total Value Locked)
      console.log(`\n💰 TVL Calculation:`);
      console.log(`   Total Collateral: ${formatEther(totalLocked)} DAI`);
      console.log(`   TVL: $${formatEther(totalLocked)} (assuming 1 DAI = $1)`);
    }

    console.log(`\n${isSubscribed ? 
      '✅ MeToken is subscribed and ready for trading!' : 
      '❌ MeToken needs to be subscribed before trading is enabled.'}`);
    
    return {
      isSubscribed,
      meTokenInfo: {
        owner,
        hubId: hubId.toString(),
        balancePooled: balancePooled.toString(),
        balanceLocked: balanceLocked.toString(),
        totalLocked: totalLocked.toString(),
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        endCooldown: endCooldown.toString(),
        targetHubId: targetHubId.toString(),
        migration
      },
      tokenInfo: {
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        address: meTokenAddress
      },
      tvl: formatEther(totalLocked)
    };
  } catch (error) {
    console.error(`❌ Failed to check MeToken subscription status:`, error);
    return {
      isSubscribed: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Quick subscription check (returns boolean only)
 */
export async function quickSubscriptionCheck(
  meTokenAddress: string,
  network: keyof typeof METOKEN_CONTRACTS = 'BASE'
): Promise<boolean> {
  try {
    const result = await checkMeTokenSubscriptionStatus(meTokenAddress, network);
    return result.isSubscribed;
  } catch (error) {
    console.error('Quick subscription check failed:', error);
    return false;
  }
}

/**
 * Calculate MeToken price using the bonding curve
 */
export async function calculateMeTokenPrice(
  meTokenAddress: string,
  network: keyof typeof METOKEN_CONTRACTS = 'BASE'
) {
  try {
    console.log(`\n💰 Calculating MeToken price...`);
    
    // Get current supply
    const totalSupply = await publicClient.readContract({
      address: meTokenAddress as `0x${string}`,
      abi: METOKEN_ERC20_ABI,
      functionName: 'totalSupply'
    });

    // Get MeToken info
    const meTokenInfo = await publicClient.readContract({
      address: METOKEN_CONTRACTS[network].DIAMOND,
      abi: DIAMOND_ABI,
      functionName: 'getMeTokenInfo',
      args: [meTokenAddress as `0x${string}`]
    });

    const [, hubId, balancePooled] = meTokenInfo as [string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, string];

    if (totalSupply === BigInt(0)) {
      console.log(`❌ MeToken has no supply yet`);
      return { price: '0', priceInUSD: '$0' };
    }

    // Calculate price using bonding curve formula
    // Price = (balancePooled / totalSupply) * hub configuration
    const price = Number(balancePooled) / Number(totalSupply);
    
    console.log(`📊 Price calculation:`);
    console.log(`   Balance Pooled: ${formatEther(balancePooled)} DAI`);
    console.log(`   Total Supply: ${formatEther(totalSupply)} tokens`);
    console.log(`   Calculated Price: ${price.toFixed(6)} DAI per token`);
    
    return {
      price: price.toFixed(6),
      priceInUSD: `$${price.toFixed(6)}`,
      balancePooled: formatEther(balancePooled),
      totalSupply: formatEther(totalSupply)
    };
  } catch (error) {
    console.error(`❌ Failed to calculate MeToken price:`, error);
    return { price: '0', priceInUSD: '$0', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
