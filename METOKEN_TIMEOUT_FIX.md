# MeToken Creation Timeout Fix

## Problem

Users were experiencing timeout errors when creating MeTokens, causing the transaction to appear failed even though it might have succeeded on-chain. The issue occurred because:

1. **Long blockchain confirmation times**: The meToken `subscribe` function on the Diamond contract involves multiple internal operations:
   - Creating a new ERC20 token via MeTokenFactory
   - Registering it with the Diamond contract
   - Transferring DAI collateral to the vault (if depositing)
   - Minting initial meTokens

2. **EIP-4337 UserOperation complexity**: Using Account Kit's smart accounts adds additional verification steps:
   - UserOperation validation
   - Paymaster verification (if using sponsored/USDC gas)
   - Bundler processing

3. **Sequential approval requirements**: If depositing DAI, two approval transactions are needed:
   - Approve vault contract
   - Approve Diamond contract (fallback)

4. **No recovery mechanism**: If `waitForUserOperationTransaction` timed out, the user had no way to recover or check if their MeToken was created.

## Solution

### New Files Created

#### 1. `/lib/hooks/metokens/useMeTokenCreation.ts`
A robust hook for MeToken creation that implements:

- **Progressive status updates**: Gives users real-time feedback on each step
- **Fire-and-forget pattern**: Sends the transaction and switches to polling instead of blocking
- **localStorage persistence**: Saves pending transactions for recovery after page refresh
- **Automatic recovery**: Polls the subgraph to find MeTokens that may have been created from timed-out transactions
- **Smart retry logic**: Can retry failed transactions without creating duplicates

Key features:
```typescript
export function useMeTokenCreation() {
  return {
    state,                      // Current status with progress percentage
    createMeToken,              // Main creation function
    pendingTransactions,        // List of pending/recovered transactions
    checkPendingTransactions,   // Manual recovery check
    clearPendingTransaction,    // Remove from pending list
    retryPendingTransaction,    // Retry a failed/timeout transaction
  };
}
```

#### 2. `/components/UserProfile/RobustMeTokenCreator.tsx`
A new UI component that uses `useMeTokenCreation`:

- **Progress bar**: Shows creation progress (0-100%)
- **Status messages**: Displays current step
- **Pending transaction recovery**: Shows banner if pending transactions exist
- **Transaction links**: Links to Basescan for txHash and MeToken address

#### 3. `/lib/utils/transactionPolling.ts`
Low-level utilities for transaction recovery:

- **`pollUserOperationReceipt`**: Polls EntryPoint logs to find UserOperation status
- **`waitForUserOperationWithFallback`**: Standard wait with automatic polling fallback
- **`findRecentMeTokenForAddress`**: Searches subgraph for MeTokens owned by an address

### How It Works

```
User clicks "Create MeToken"
        ↓
Check DAI balance (10% progress)
        ↓
Approve DAI for Vault (30% progress)
        ↓
Approve DAI for Diamond (40% progress)
        ↓
Send subscribe UserOperation (50% progress)
        ↓
Save to localStorage for recovery
        ↓
Wait for confirmation (60% progress)
        ↓
┌────────────────────────────────────┐
│  If wait times out after 2 min:   │
│  - Switch to polling mode         │
│  - Query subgraph every 10s       │
│  - Check for MeTokens by owner    │
└────────────────────────────────────┘
        ↓
Find MeToken address (80% progress)
        ↓
Sync to database (90% progress)
        ↓
Success! (100% progress)
```

### Integration

#### Replace existing component:

```tsx
// Before
import { AlchemyMeTokenCreator } from '@/components/UserProfile/AlchemyMeTokenCreator';

// After
import { RobustMeTokenCreator } from '@/components/UserProfile/RobustMeTokenCreator';

// Usage
<RobustMeTokenCreator 
  onMeTokenCreated={(address, txHash) => {
    console.log('MeToken created:', address);
  }} 
/>
```

#### Or use the hook directly:

```tsx
import { useMeTokenCreation } from '@/lib/hooks/metokens/useMeTokenCreation';

function MyComponent() {
  const { state, createMeToken, pendingTransactions } = useMeTokenCreation();
  
  const handleCreate = async () => {
    try {
      await createMeToken({
        name: 'My Token',
        symbol: 'MTK',
        hubId: 1,
        assetsDeposited: '100',
      });
    } catch (err) {
      // Handle error
    }
  };
  
  return (
    <div>
      <p>Status: {state.status}</p>
      <p>Progress: {state.progress}%</p>
      <p>Message: {state.message}</p>
      {state.meTokenAddress && <p>Created: {state.meTokenAddress}</p>}
    </div>
  );
}
```

### Timeout Configuration

Default timeouts:
- **DAI approval send**: 90 seconds
- **DAI approval wait**: 120 seconds
- **Subscribe send**: 60 seconds
- **Subscribe wait**: 120 seconds (then switches to polling)
- **Polling interval**: 10 seconds
- **Max polling attempts**: 30 (5 minutes total)

### Error Recovery

If a transaction times out:

1. **Transaction is saved to localStorage** with status 'timeout'
2. **User sees "Pending Transactions" banner** on next visit
3. **Click "Retry" to**:
   - First check if MeToken was actually created
   - If found, mark as confirmed
   - If not found, retry the transaction

### Improvements Over Previous Implementation

| Aspect | Before | After |
|--------|--------|-------|
| Timeout handling | Transaction fails with generic error | Switches to polling, continues in background |
| Progress feedback | Binary loading state | 10-step progress with percentages |
| Recovery | None | localStorage persistence + automatic recovery |
| Duplicate prevention | Could accidentally create duplicates | Checks for existing MeToken before retry |
| Error messages | Generic bundler errors | Parsed errors with specific suggestions |

## Testing

1. **Normal flow**: Create MeToken with 0 DAI - should complete in ~30 seconds
2. **DAI deposit flow**: Create with 1 DAI - requires approvals, may take 1-2 minutes
3. **Timeout simulation**: Disconnect network after sending - should recover on reconnect
4. **Page refresh**: Refresh during creation - should see pending transaction banner
5. **Retry**: Use "Retry" on timed out transaction - should find existing or create new

## Files Modified/Created

- ✅ `/lib/hooks/metokens/useMeTokenCreation.ts` (NEW)
- ✅ `/components/UserProfile/RobustMeTokenCreator.tsx` (NEW)
- ✅ `/lib/utils/transactionPolling.ts` (NEW)
- ✅ `/METOKEN_TIMEOUT_FIX.md` (NEW - this file)

## Next Steps

1. **Replace existing components**: Update pages that use `AlchemyMeTokenCreator` or `MeTokenCreator` to use `RobustMeTokenCreator`
2. **Add Supabase persistence**: Optionally save pending transactions to Supabase for cross-device recovery
3. **Add notification system**: Use browser notifications for background completion
4. **Add analytics**: Track timeout rates and success rates
