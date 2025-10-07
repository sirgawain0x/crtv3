import { useState, useEffect, useCallback, useRef } from 'react';
import { MeTokenData } from './useMeTokensSupabase';
import { 
  isMeTokenSubscribed, 
  isMeTokenNotSubscribed, 
  getMeTokenSubscriptionStatus,
  getMeTokenSubscriptionDetails,
  requiresSubscriptionForTrading,
  getSubscriptionRequirementsMessage
} from '@/lib/utils/metokenSubscriptionUtils';

export interface MeTokenSubscriptionState {
  isSubscribed: boolean;
  isNotSubscribed: boolean;
  status: 'subscribed' | 'not-subscribed';
  canTrade: boolean;
  requiresSubscription: boolean;
  balancePooled: string;
  balanceLocked: string;
  hubId: string;
  totalLocked: bigint;
  requirementsMessage: string;
}

export function useMeTokenSubscription(meToken: MeTokenData | null) {
  const [subscriptionState, setSubscriptionState] = useState<MeTokenSubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!meToken || !meToken.address) {
      setSubscriptionState(null);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 useMeTokenSubscription: Checking real blockchain status for:', meToken.address);
      
      // Use the blockchain utility function to get real subscription status
      const { checkMeTokenSubscriptionFromBlockchain } = await import('@/lib/utils/metokenSubscriptionUtils');
      const blockchainStatus = await checkMeTokenSubscriptionFromBlockchain(meToken.address);
      
      console.log('✅ useMeTokenSubscription: Real blockchain status:', blockchainStatus);
      
      const state: MeTokenSubscriptionState = {
        isSubscribed: blockchainStatus.isSubscribed,
        isNotSubscribed: !blockchainStatus.isSubscribed,
        status: blockchainStatus.status,
        canTrade: blockchainStatus.canTrade,
        requiresSubscription: blockchainStatus.requiresSubscription,
        balancePooled: blockchainStatus.balancePooled,
        balanceLocked: blockchainStatus.balanceLocked,
        hubId: blockchainStatus.hubId,
        totalLocked: BigInt(blockchainStatus.totalLocked),
        requirementsMessage: blockchainStatus.isSubscribed 
          ? 'MeToken is subscribed and ready for trading.'
          : 'MeToken must be subscribed to a hub before trading is enabled. Please subscribe your MeToken first.'
      };

      setSubscriptionState(state);
    } catch (error) {
      console.error('❌ useMeTokenSubscription: Failed to check real subscription status:', error);
      
      // Fallback to local data if blockchain check fails
      try {
        const details = getMeTokenSubscriptionDetails(meToken);
        
        const state: MeTokenSubscriptionState = {
          isSubscribed: details.isSubscribed,
          isNotSubscribed: !details.isSubscribed,
          status: details.status as 'subscribed' | 'not-subscribed',
          canTrade: details.canTrade,
          requiresSubscription: details.requiresSubscription,
          balancePooled: details.balancePooled,
          balanceLocked: details.balanceLocked,
          hubId: details.hubId,
          totalLocked: details.totalLocked,
          requirementsMessage: getSubscriptionRequirementsMessage(meToken)
        };

        setSubscriptionState(state);
      } catch (fallbackError) {
        console.error('❌ useMeTokenSubscription: Fallback also failed:', fallbackError);
        setSubscriptionState(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [meToken]);

  // Keep a stable reference to avoid infinite re-renders
  const checkSubscriptionStatusRef = useRef(checkSubscriptionStatus);
  
  useEffect(() => {
    checkSubscriptionStatusRef.current = checkSubscriptionStatus;
  }, [checkSubscriptionStatus]);

  // Check subscription status when meToken changes (only meToken.address as dependency)
  useEffect(() => {
    checkSubscriptionStatusRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meToken?.address]); // Only re-run when the meToken address changes

  return {
    subscriptionState,
    isLoading,
    checkSubscriptionStatus,
    // Convenience methods
    isSubscribed: subscriptionState?.isSubscribed ?? false,
    isNotSubscribed: subscriptionState?.isNotSubscribed ?? true,
    canTrade: subscriptionState?.canTrade ?? false,
    requiresSubscription: subscriptionState?.requiresSubscription ?? true,
    status: subscriptionState?.status ?? 'not-subscribed',
    requirementsMessage: subscriptionState?.requirementsMessage ?? 'MeToken subscription status unknown.'
  };
}
