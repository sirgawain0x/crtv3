import { checkMeTokenSubscriptionStatus, calculateMeTokenPrice } from './meTokenProtocolChecker';

/**
 * Check the specific MeToken from the original error
 */
export async function checkProblematicMeToken() {
  const meTokenAddress = '0x2953B96F9160955f6256c9D444F8F7950E6647Df';
  
  console.log(`\n🔍 Checking the MeToken from your original error...`);
  console.log(`📍 Address: ${meTokenAddress}`);
  console.log(`⚠️  This was the address that caused the "msg.sender already owns a meToken" error\n`);

  try {
    // Check subscription status
    const subscriptionResult = await checkMeTokenSubscriptionStatus(meTokenAddress, 'BASE');
    
    if (subscriptionResult.error) {
      console.error(`❌ Error checking subscription: ${subscriptionResult.error}`);
      return false;
    }

    // Calculate price if subscribed
    if (subscriptionResult.isSubscribed) {
      console.log(`\n💰 Calculating price...`);
      const priceResult = await calculateMeTokenPrice(meTokenAddress, 'BASE');
      console.log(`   Current Price: ${priceResult.priceInUSD}`);
    }

    console.log(`\n🎯 Summary:`);
    console.log(`   MeToken: ${subscriptionResult.tokenInfo?.name} (${subscriptionResult.tokenInfo?.symbol})`);
    console.log(`   Owner: ${subscriptionResult.meTokenInfo?.owner}`);
    console.log(`   Subscribed: ${subscriptionResult.isSubscribed ? 'Yes' : 'No'}`);
    console.log(`   Hub ID: ${subscriptionResult.meTokenInfo?.hubId}`);
    
    if (subscriptionResult.isSubscribed) {
      console.log(`   TVL: $${subscriptionResult.tvl}`);
      console.log(`   Pooled: ${subscriptionResult.meTokenInfo?.balancePooled} DAI`);
      console.log(`   Locked: ${subscriptionResult.meTokenInfo?.balanceLocked} DAI`);
    }

    return subscriptionResult.isSubscribed;
  } catch (error) {
    console.error(`❌ Failed to check MeToken:`, error);
    return false;
  }
}

/**
 * Check if a specific address already owns a MeToken
 */
export async function checkIfAddressOwnsMeToken(ownerAddress: string) {
  console.log(`\n🔍 Checking if address ${ownerAddress} already owns a MeToken...`);
  
  // Note: This would require querying the Diamond contract for all MeTokens
  // or using the subgraph to find MeTokens by owner
  // For now, we'll use the subscription checker on the specific MeToken
  
  const meTokenAddress = '0x2953B96F9160955f6256c9D444F8F7950E6647Df';
  
  try {
    const result = await checkMeTokenSubscriptionStatus(meTokenAddress, 'BASE');
    
    if (result.meTokenInfo?.owner.toLowerCase() === ownerAddress.toLowerCase()) {
      console.log(`✅ Address ${ownerAddress} DOES own this MeToken`);
      console.log(`   MeToken: ${result.tokenInfo?.name} (${result.tokenInfo?.symbol})`);
      return true;
    } else {
      console.log(`❌ Address ${ownerAddress} does NOT own this MeToken`);
      console.log(`   Actual owner: ${result.meTokenInfo?.owner}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking ownership:`, error);
    return false;
  }
}

// Export for easy use
export { checkMeTokenSubscriptionStatus, calculateMeTokenPrice };
