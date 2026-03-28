import { formatEther } from 'viem';
import { getMeTokenSubscriptionDetails, formatSubscriptionStatus } from './checkMeTokenSubscription';
import { logger } from '@/lib/utils/logger';

/**
 * Check and display MeToken subscription status
 * @param meTokenAddress - The MeToken contract address to check
 */
export async function checkMeTokenSubscriptionStatus(meTokenAddress: string) {
  logger.debug(`\n🔍 Checking MeToken subscription status...`);
  logger.debug(`📍 MeToken Address: ${meTokenAddress}`);
  logger.debug(`⏳ Querying blockchain...\n`);

  try {
    const info = await getMeTokenSubscriptionDetails(meTokenAddress);
    
    if (info.error) {
      logger.error(`❌ Error: ${info.error}`);
      return false;
    }

    logger.debug(`📊 MeToken Information:`);
    if (info.basicInfo) {
      logger.debug(`   Name: ${info.basicInfo.name}`);
      logger.debug(`   Symbol: ${info.basicInfo.symbol}`);
      logger.debug(`   Owner: ${info.basicInfo.owner}`);
      logger.debug(`   Total Supply: ${formatEther(BigInt(info.basicInfo.totalSupply))} tokens`);
    }
    
    logger.debug(`\n🔗 Subscription Status:`);
    logger.debug(`   ${formatSubscriptionStatus(info.subscriptionStatus)}`);
    
    if (info.subscriptionStatus.isSubscribed) {
      logger.debug(`   📈 Pooled Balance: ${formatEther(BigInt(info.subscriptionStatus.balancePooled))} DAI`);
      logger.debug(`   🔒 Locked Balance: ${formatEther(BigInt(info.subscriptionStatus.balanceLocked))} DAI`);
      logger.debug(`   🏢 Hub ID: ${info.subscriptionStatus.hubId}`);
      logger.debug(`   💰 Total Locked: ${formatEther(BigInt(info.subscriptionStatus.totalLocked))} DAI`);
      logger.debug(`   ✅ Trading: ${info.subscriptionStatus.canTrade ? 'Enabled' : 'Disabled'}`);
    } else {
      logger.debug(`   ⚠️  This MeToken is not subscribed to any hub`);
      logger.debug(`   💡 To enable trading, the MeToken must be subscribed to a hub with DAI deposits`);
    }

    logger.debug(`\n${info.subscriptionStatus.isSubscribed ? 
      '✅ MeToken is subscribed and ready for trading!' : 
      '❌ MeToken needs to be subscribed before trading is enabled.'}`);
    
    return info.subscriptionStatus.isSubscribed;
  } catch (error) {
    logger.error(`❌ Failed to check MeToken subscription status:`, error);
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
    logger.error('Quick subscription check failed:', error);
    return false;
  }
}

/**
 * Batch check multiple MeTokens
 * @param meTokenAddresses - Array of MeToken addresses to check
 */
export async function batchCheckMeTokenSubscriptions(meTokenAddresses: string[]) {
  logger.debug(`\n🔍 Batch checking ${meTokenAddresses.length} MeTokens...\n`);
  
  for (const [index, address] of meTokenAddresses.entries()) {
    logger.debug(`[${index + 1}/${meTokenAddresses.length}] Checking ${address}`);
    try {
      const info = await getMeTokenSubscriptionDetails(address);
      const status = info.subscriptionStatus.isSubscribed ? '✅ Subscribed' : '❌ Not Subscribed';
      logger.debug(`   ${status} - Hub: ${info.subscriptionStatus.hubId}`);
      if (info.basicInfo) {
        logger.debug(`   ${info.basicInfo.name} (${info.basicInfo.symbol})`);
      }
    } catch (error) {
      logger.debug(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    logger.debug('');
  }
}
