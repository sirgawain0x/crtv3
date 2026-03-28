import { checkMeTokenSubscriptionStatus, calculateMeTokenPrice } from './meTokenProtocolChecker';
import { logger } from '@/lib/utils/logger';

/**
 * Check the specific MeToken from the original error
 */
export async function checkProblematicMeToken() {
  const meTokenAddress = '0x2953B96F9160955f6256c9D444F8F7950E6647Df';
  
  logger.debug(`\n🔍 Checking the MeToken from your original error...`);
  logger.debug(`📍 Address: ${meTokenAddress}`);
  logger.debug(`⚠️  This was the address that caused the "msg.sender already owns a meToken" error\n`);

  try {
    // Check subscription status
    const subscriptionResult = await checkMeTokenSubscriptionStatus(meTokenAddress, 'BASE');
    
    if (subscriptionResult.error) {
      logger.error(`❌ Error checking subscription: ${subscriptionResult.error}`);
      return false;
    }

    // Calculate price if subscribed
    if (subscriptionResult.isSubscribed) {
      logger.debug(`\n💰 Calculating price...`);
      const priceResult = await calculateMeTokenPrice(meTokenAddress, 'BASE');
      logger.debug(`   Current Price: ${priceResult.priceInUSD}`);
    }

    logger.debug(`\n🎯 Summary:`);
    logger.debug(`   MeToken: ${subscriptionResult.tokenInfo?.name} (${subscriptionResult.tokenInfo?.symbol})`);
    logger.debug(`   Owner: ${subscriptionResult.meTokenInfo?.owner}`);
    logger.debug(`   Subscribed: ${subscriptionResult.isSubscribed ? 'Yes' : 'No'}`);
    logger.debug(`   Hub ID: ${subscriptionResult.meTokenInfo?.hubId}`);
    
    if (subscriptionResult.isSubscribed) {
      logger.debug(`   TVL: $${subscriptionResult.tvl}`);
      logger.debug(`   Pooled: ${subscriptionResult.meTokenInfo?.balancePooled} DAI`);
      logger.debug(`   Locked: ${subscriptionResult.meTokenInfo?.balanceLocked} DAI`);
    }

    return subscriptionResult.isSubscribed;
  } catch (error) {
    logger.error(`❌ Failed to check MeToken:`, error);
    return false;
  }
}

/**
 * Check if a specific address already owns a MeToken
 */
export async function checkIfAddressOwnsMeToken(ownerAddress: string) {
  logger.debug(`\n🔍 Checking if address ${ownerAddress} already owns a MeToken...`);
  
  // Note: This would require querying the Diamond contract for all MeTokens
  // or using the subgraph to find MeTokens by owner
  // For now, we'll use the subscription checker on the specific MeToken
  
  const meTokenAddress = '0x2953B96F9160955f6256c9D444F8F7950E6647Df';
  
  try {
    const result = await checkMeTokenSubscriptionStatus(meTokenAddress, 'BASE');
    
    if (result.meTokenInfo?.owner.toLowerCase() === ownerAddress.toLowerCase()) {
      logger.debug(`✅ Address ${ownerAddress} DOES own this MeToken`);
      logger.debug(`   MeToken: ${result.tokenInfo?.name} (${result.tokenInfo?.symbol})`);
      return true;
    } else {
      logger.debug(`❌ Address ${ownerAddress} does NOT own this MeToken`);
      logger.debug(`   Actual owner: ${result.meTokenInfo?.owner}`);
      return false;
    }
  } catch (error) {
    logger.error(`❌ Error checking ownership:`, error);
    return false;
  }
}

// Export for easy use
export { checkMeTokenSubscriptionStatus, calculateMeTokenPrice };
