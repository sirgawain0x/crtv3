import { checkMeTokenSubscriptionFromBlockchain, getMeTokenSubscriptionInfo } from './metokenSubscriptionUtils';

/**
 * Simple utility to check if a MeToken is subscribed
 * @param meTokenAddress - The MeToken contract address
 * @returns Promise<boolean> - true if subscribed, false if not
 */
export async function isMeTokenSubscribed(meTokenAddress: string): Promise<boolean> {
  try {
    const result = await checkMeTokenSubscriptionFromBlockchain(meTokenAddress);
    return result.isSubscribed;
  } catch (error) {
    console.error('Error checking MeToken subscription:', error);
    return false;
  }
}

/**
 * Get detailed subscription status for a MeToken
 * @param meTokenAddress - The MeToken contract address
 * @returns Detailed subscription information
 */
export async function getMeTokenSubscriptionDetails(meTokenAddress: string) {
  return await getMeTokenSubscriptionInfo(meTokenAddress);
}

/**
 * Check multiple MeTokens subscription status
 * @param meTokenAddresses - Array of MeToken contract addresses
 * @returns Array of subscription status for each MeToken
 */
export async function checkMultipleMeTokenSubscriptions(meTokenAddresses: string[]) {
  const results = await Promise.allSettled(
    meTokenAddresses.map(async (address) => {
      const info = await getMeTokenSubscriptionInfo(address);
      return info;
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        address: meTokenAddresses[index],
        subscriptionStatus: {
          isSubscribed: false,
          status: 'not-subscribed' as const,
          balancePooled: '0',
          balanceLocked: '0',
          hubId: '0',
          totalLocked: '0',
          canTrade: false,
          requiresSubscription: true
        },
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}

/**
 * Format subscription status for display
 * @param subscriptionInfo - Subscription information
 * @returns Formatted string for display
 */
export function formatSubscriptionStatus(subscriptionInfo: {
  isSubscribed: boolean;
  balancePooled: string;
  balanceLocked: string;
  hubId: string;
  totalLocked: string;
}): string {
  if (subscriptionInfo.isSubscribed) {
    return `✅ Subscribed to Hub ${subscriptionInfo.hubId} - Total Locked: ${subscriptionInfo.totalLocked} DAI`;
  } else {
    return `❌ Not subscribed - No locked balances`;
  }
}
