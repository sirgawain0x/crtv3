// Example: How to check if a MeToken is NOT subscribed

import { MeTokenData } from '@/lib/hooks/metokens/useMeTokensSupabase';
import { 
  isMeTokenNotSubscribed, 
  isMeTokenSubscribed,
  getMeTokenSubscriptionDetails,
  requiresSubscriptionForTrading 
} from '@/lib/utils/metokenSubscriptionUtils';

// Example 1: Simple boolean check
export function checkIfMeTokenNeedsSubscription(meToken: MeTokenData): boolean {
  return isMeTokenNotSubscribed(meToken);
}

// Example 2: More detailed check with information
export function getMeTokenSubscriptionInfo(meToken: MeTokenData) {
  const details = getMeTokenSubscriptionDetails(meToken);
  
  return {
    needsSubscription: details.requiresSubscription,
    canTrade: details.canTrade,
    status: details.status,
    message: details.requiresSubscription 
      ? 'This MeToken needs to be subscribed to a hub before trading is enabled.'
      : 'This MeToken is subscribed and ready for trading.'
  };
}

// Example 3: Check before allowing trading
export function canUserTradeMeToken(meToken: MeTokenData): boolean {
  return !requiresSubscriptionForTrading(meToken);
}

// Example 4: Get subscription requirements
export function getSubscriptionRequirements(meToken: MeTokenData) {
  if (isMeTokenSubscribed(meToken)) {
    return {
      needsSubscription: false,
      message: 'MeToken is already subscribed and ready for trading.',
      action: null
    };
  }
  
  return {
    needsSubscription: true,
    message: 'MeToken must be subscribed to a hub before trading is enabled.',
    action: 'Subscribe to Hub',
    requirements: [
      'Deposit DAI as collateral',
      'Choose a hub to subscribe to',
      'Enable trading for your MeToken'
    ]
  };
}

// Example 5: React component usage
export function MeTokenTradingGate({ meToken, children }: { 
  meToken: MeTokenData; 
  children: React.ReactNode; 
}) {
  const needsSubscription = isMeTokenNotSubscribed(meToken);
  
  if (needsSubscription) {
    return (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-yellow-800">Subscription Required</h3>
        <p className="text-yellow-700 text-sm mt-1">
          This MeToken must be subscribed to a hub before trading is enabled.
        </p>
      </div>
    );
  }
  
  return <>{children}</>;
}
