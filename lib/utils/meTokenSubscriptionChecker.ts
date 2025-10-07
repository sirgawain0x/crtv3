import { formatEther } from 'viem';
import { getMeTokenSubscriptionDetails, formatSubscriptionStatus } from './checkMeTokenSubscription';

/**
 * Check and display MeToken subscription status
 * @param meTokenAddress - The MeToken contract address to check
 */
export async function checkMeTokenSubscriptionStatus(meTokenAddress: string) {
  console.log(`\n🔍 Checking MeToken subscription status...`);
  console.log(`📍 MeToken Address: ${meTokenAddress}`);
  console.log(`⏳ Querying blockchain...\n`);

  try {
    const info = await getMeTokenSubscriptionDetails(meTokenAddress);
    
    if (info.error) {
      console.error(`❌ Error: ${info.error}`);
      return false;
    }

    console.log(`📊 MeToken Information:`);
    if (info.basicInfo) {
      console.log(`   Name: ${info.basicInfo.name}`);
      console.log(`   Symbol: ${info.basicInfo.symbol}`);
      console.log(`   Owner: ${info.basicInfo.owner}`);
      console.log(`   Total Supply: ${formatEther(BigInt(info.basicInfo.totalSupply))} tokens`);
    }
    
    console.log(`\n🔗 Subscription Status:`);
    console.log(`   ${formatSubscriptionStatus(info.subscriptionStatus)}`);
    
    if (info.subscriptionStatus.isSubscribed) {
      console.log(`   📈 Pooled Balance: ${formatEther(BigInt(info.subscriptionStatus.balancePooled))} DAI`);
      console.log(`   🔒 Locked Balance: ${formatEther(BigInt(info.subscriptionStatus.balanceLocked))} DAI`);
      console.log(`   🏢 Hub ID: ${info.subscriptionStatus.hubId}`);
      console.log(`   💰 Total Locked: ${formatEther(BigInt(info.subscriptionStatus.totalLocked))} DAI`);
      console.log(`   ✅ Trading: ${info.subscriptionStatus.canTrade ? 'Enabled' : 'Disabled'}`);
    } else {
      console.log(`   ⚠️  This MeToken is not subscribed to any hub`);
      console.log(`   💡 To enable trading, the MeToken must be subscribed to a hub with DAI deposits`);
    }

    console.log(`\n${info.subscriptionStatus.isSubscribed ? 
      '✅ MeToken is subscribed and ready for trading!' : 
      '❌ MeToken needs to be subscribed before trading is enabled.'}`);
    
    return info.subscriptionStatus.isSubscribed;
  } catch (error) {
    console.error(`❌ Failed to check MeToken subscription status:`, error);
    return false;
  }
}

/**
 * Quick check function that returns just the subscription status
 * @param meTokenAddress - The MeToken contract address
 * @returns Promise<boolean> - true if subscribed, false if not
 */
export async function quickSubscriptionCheck(meTokenAddress: string): Promise<boolean> {
  try {
    const info = await getMeTokenSubscriptionDetails(meTokenAddress);
    return info.subscriptionStatus.isSubscribed;
  } catch (error) {
    console.error('Quick subscription check failed:', error);
    return false;
  }
}

/**
 * Batch check multiple MeTokens
 * @param meTokenAddresses - Array of MeToken addresses to check
 */
export async function batchCheckMeTokenSubscriptions(meTokenAddresses: string[]) {
  console.log(`\n🔍 Batch checking ${meTokenAddresses.length} MeTokens...\n`);
  
  for (const [index, address] of meTokenAddresses.entries()) {
    console.log(`[${index + 1}/${meTokenAddresses.length}] Checking ${address}`);
    try {
      const info = await getMeTokenSubscriptionDetails(address);
      const status = info.subscriptionStatus.isSubscribed ? '✅ Subscribed' : '❌ Not Subscribed';
      console.log(`   ${status} - Hub: ${info.subscriptionStatus.hubId}`);
      if (info.basicInfo) {
        console.log(`   ${info.basicInfo.name} (${info.basicInfo.symbol})`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');
  }
}
