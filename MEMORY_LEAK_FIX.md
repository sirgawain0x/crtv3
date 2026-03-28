# Memory Leak & App Restart Fix

## Problem
The app was restarting/crashing when users stayed on the profile page for an extended period due to **memory leaks and infinite re-rendering loops** in React hooks.

## Root Cause
Multiple hooks had circular dependency issues where `useEffect` hooks included `useCallback` functions in their dependency arrays, causing:

1. **Infinite re-subscriptions** - Hooks were recreated on every render
2. **Memory leaks** - Old subscriptions/effects weren't cleaned up properly  
3. **Cascading re-renders** - State updates triggered more re-renders
4. **Eventually crashes** - Memory filled up causing app restarts

### Affected Files
1. `lib/hooks/metokens/useMeTokensSupabase.ts` - Real-time Supabase subscriptions
2. `lib/hooks/metokens/useMeTokenSubscription.ts` - Subscription status checks
3. `lib/hooks/metokens/useMeTokenHoldings.ts` - Holdings data fetching
4. `components/UserProfile/MeTokenSubscription.tsx` - DAI balance and status checks

## Solution

### Pattern Used: `useRef` for Stable References

Instead of including unstable `useCallback` functions in dependency arrays, we now:

1. Store the callback in a `useRef`
2. Update the ref whenever the callback changes
3. Use only stable values (like `address`) in the dependency array
4. Call `ref.current()` to always get the latest version

### Example Fix

**Before (causing infinite loops):**
```typescript
useEffect(() => {
  const subscription = subscribeToUpdates(address, () => {
    checkUserMeToken(); // Unstable reference
  });
  return () => subscription.unsubscribe();
}, [address, checkUserMeToken]); // ❌ checkUserMeToken changes every render
```

**After (stable and efficient):**
```typescript
const checkUserMeTokenRef = useRef(checkUserMeToken);

useEffect(() => {
  checkUserMeTokenRef.current = checkUserMeToken;
}, [checkUserMeToken]);

useEffect(() => {
  const subscription = subscribeToUpdates(address, () => {
    checkUserMeTokenRef.current(); // Always calls latest version
  });
  return () => subscription.unsubscribe();
}, [address]); // ✅ Only re-subscribe when address changes
```

## Changes Made

### 1. `useMeTokensSupabase.ts`
- Added `useRef` import
- Created stable reference for `checkUserMeToken`
- Removed `checkUserMeToken` from dependency arrays
- Supabase subscription now only recreates when address changes

### 2. `useMeTokenSubscription.ts`  
- Added `useRef` import
- Created stable reference for `checkSubscriptionStatus`
- Changed dependency to only `meToken?.address`

### 3. `useMeTokenHoldings.ts`
- Changed `fetchHoldings` dependency to only `targetAddress`
- Added eslint-disable comment to document intentional deviation

### 4. `MeTokenSubscription.tsx`
- Changed `checkDaiBalance` to only depend on `client`
- Changed `checkRealSubscriptionStatus` to only depend on `meToken.address`
- Added eslint-disable comments

## Benefits

✅ **No more memory leaks** - Subscriptions are properly managed  
✅ **No more infinite loops** - Effects only run when truly needed  
✅ **Better performance** - Fewer unnecessary re-renders  
✅ **Stable app** - Won't crash after extended use  
✅ **Better UX** - Smooth experience on profile pages

## Testing

To verify the fix works:
1. Navigate to a user profile page
2. Open browser DevTools → Performance tab
3. Start recording
4. Wait 5-10 minutes on the page
5. Stop recording and check:
   - Memory usage should be stable (not continuously growing)
   - No excessive re-renders in the flame graph
   - Console should not show repeated "Balance update received" logs

## Prevention

**Best Practices Going Forward:**

1. ⚠️ **Never include `useCallback` functions directly in `useEffect` dependencies** unless absolutely necessary
2. ✅ Use `useRef` pattern for callbacks in subscriptions/listeners
3. ✅ Only include primitive values (strings, numbers) or stable objects in dependencies
4. ✅ Document intentional dependency array deviations with comments
5. ✅ Test components for memory leaks during extended use

## Related Issues

This fix resolves issues with:
- App freezing on profile pages
- Browser tab crashes after extended use
- Excessive API calls to Supabase
- High memory consumption
- Slow page performance over time

