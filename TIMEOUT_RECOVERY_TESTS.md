# MeToken Creation Tests

This document describes the comprehensive test suite for MeToken creation functionality, including timeout recovery and the full creation flow.

## Test Files

### 1. `lib/utils/__tests__/userOperationTimeout.test.ts`

Tests for the core timeout utility functions:

- **sendUserOperationWithTimeout**: Tests timeout handling for sending user operations
  - ✅ Returns result when operation completes before timeout
  - ✅ Throws timeout error when operation exceeds timeout
  - ✅ Calls onProgress callback with correct stages
  - ✅ Calls onProgress with timeout stage on timeout

- **waitForUserOperationWithTimeout**: Tests timeout handling for waiting for transaction confirmation
  - ✅ Returns txHash when confirmation completes before timeout
  - ✅ Throws timeout error when confirmation exceeds timeout
  - ✅ Includes operation hash in timeout error message

- **isTimeoutError**: Tests timeout error detection
  - ✅ Returns true for timeout errors
  - ✅ Returns false for non-timeout errors

- **shouldVerifyTransactionAfterTimeout**: Tests whether to verify transaction after timeout
  - ✅ Returns true for timeout errors that indicate submission
  - ✅ Returns false for non-timeout errors
  - ✅ Returns false for timeout errors without submission indication

- **analyzeTransactionError**: Tests error analysis
  - ✅ Analyzes timeout errors correctly
  - ✅ Analyzes non-timeout errors using bundler parser

- **createProgressTracker**: Tests progress tracking
  - ✅ Tracks progress through stages
  - ✅ Handles error stage

- **executeUserOperationWithTimeout**: Tests full flow execution
  - ✅ Executes full flow: send and wait
  - ✅ Handles timeout during sendUserOperation
  - ✅ Handles timeout during waitForUserOperationTransaction

### 2. `lib/hooks/metokens/__tests__/timeoutRecovery.test.ts`

Tests for timeout recovery logic in MeToken creation (edge cases):

- **sendUserOperation timeout recovery**
  - ✅ Verifies MeToken was created when sendUserOperation times out
  - ✅ Rethrows original error when verification fails
  - ✅ Throws helpful message when MeToken not found after timeout

- **waitForUserOperationTransaction timeout recovery**
  - ✅ Verifies MeToken was created when confirmation times out
  - ✅ Rethrows original error when verification fails during confirmation wait

- **DAI Approval timeout recovery**
  - ✅ Verifies approval succeeded when sendUserOperation times out
  - ✅ Rethrows original error when allowance check fails
  - ✅ Verifies approval succeeded when waitForUserOperationTransaction times out

- **Error message accuracy**
  - ✅ Provides accurate error message when verification succeeds but MeToken not found
  - ✅ Provides accurate error message when confirmation times out

### 3. `lib/hooks/metokens/__tests__/meTokenCreation.test.ts`

**Integration tests for the full MeToken creation flow (logic only):**

- **Full Creation Flow**
  - ✅ Successfully creates MeToken with DAI deposit
  - ✅ Creates MeToken without DAI deposit (0 deposit)
  - ✅ Skips approvals if sufficient allowance already exists

- **Error Handling**
  - ✅ Throws error if user already has a MeToken
  - ✅ Handles RPC errors during allowance check
  - ✅ Handles approval transaction failure
  - ✅ Handles subscription transaction failure

- **State Management**
  - ✅ Updates state correctly during creation flow
  - ✅ Resets state on error

- **Database Sync**
  - ✅ Syncs MeToken to database after creation
  - ✅ Handles database sync failure gracefully

- **Validation**
  - ✅ Validates required parameters (name, symbol, hubId)
  - ✅ Validates deposit amount format

### 4. `lib/hooks/metokens/__tests__/useMeTokensSupabase.hook.test.tsx`

**React Testing Library tests for the hook's React-specific behavior:**

- **Hook Initialization**
  - ✅ Initializes with correct default state
  - ✅ Checks for existing MeToken on mount

- **MeToken Creation (React Integration)**
  - ✅ Updates state correctly during creation flow
  - ✅ Handles creation errors and updates state
  - ✅ Prevents duplicate MeToken creation

- **State Management**
  - ✅ Updates loading state during operations
  - ✅ Clears error state on successful operation

- **Timeout Recovery (React Integration)**
  - ✅ Recovers from sendUserOperation timeout if MeToken was created
  - ✅ Handles timeout recovery failure gracefully

- **checkUserMeToken (React Integration)**
  - ✅ Fetches MeToken from Supabase
  - ✅ Handles errors during MeToken check

- **Hook Dependencies**
  - ✅ Handles missing user gracefully
  - ✅ Handles missing client gracefully

## Test Coverage Summary

### What IS Tested ✅

1. **Timeout Utilities**: All timeout handling functions
2. **Timeout Recovery**: Edge cases where timeouts occur but transactions succeed
3. **Creation Flow Logic**: Step-by-step creation process
4. **Error Handling**: Various error scenarios
5. **State Management**: State transitions during creation (both logic and React)
6. **Database Sync**: Post-creation synchronization
7. **Validation**: Input validation
8. **React Hook Integration**: The `useMeTokensSupabase` hook's React-specific behavior
   - Hook initialization and state management
   - React state updates during operations
   - Hook dependency handling

### What is NOT Fully Tested ⚠️

1. **Full React Component Integration**: Testing components that use the hook
   - Would require rendering actual React components
   - Current tests focus on the hook in isolation

2. **End-to-End Flow**: Full browser-based E2E tests
   - Would require tools like Playwright or Cypress
   - Tests actual user interactions in a browser

3. **Contract Interactions**: Direct smart contract calls
   - Tests mock the contract calls but don't test against real contracts
   - Would require a testnet or local blockchain

## Running the Tests

```bash
# Run all timeout-related tests
npm test -- timeout

# Run specific test file
npm test -- lib/utils/__tests__/userOperationTimeout.test.ts
npm test -- lib/hooks/metokens/__tests__/timeoutRecovery.test.ts
npm test -- lib/hooks/metokens/__tests__/meTokenCreation.test.ts
npm test -- lib/hooks/metokens/__tests__/useMeTokensSupabase.hook.test.tsx

# Run all MeToken-related tests
npm test -- metoken

# Run all hook tests (React Testing Library)
npm test -- hook.test

# Run tests in watch mode
npm run test:watch
```

## Detailed Test Coverage

The tests cover:

1. **Timeout Scenarios**: Both sendUserOperation and waitForUserOperationTransaction timeouts
2. **Recovery Logic**: Verification checks when timeouts occur
3. **Error Handling**: Proper error propagation when verification fails
4. **User Experience**: Accurate error messages for different scenarios
5. **Approval Recovery**: DAI approval timeout recovery for both vault and DIAMOND approvals
6. **Full Creation Flow**: Complete MeToken creation from start to finish
7. **Database Operations**: Supabase sync and state management
8. **Input Validation**: Parameter validation and error handling

## Key Test Scenarios

### Successful Recovery
- Timeout occurs but transaction actually succeeded
- Verification finds the completed transaction
- User sees success message

### Verification Failure
- Timeout occurs
- Verification attempt fails (e.g., RPC error)
- Original timeout error is rethrown (not misleading message)

### Transaction Not Found
- Timeout occurs
- Verification succeeds but finds no transaction
- User sees helpful message suggesting to wait and check

## Notes

- Tests use Vitest with fake timers for timeout simulation
- Mocks are used for external dependencies (RPC calls, contract reads)
- Tests verify both the happy path and error scenarios
- Error messages are tested for accuracy and helpfulness
- React Testing Library is used for hook testing with jsdom environment
- Hook tests use `renderHook` from `@testing-library/react` (v13.1+)
- Setup file (`vitest.setup.ts`) configures jsdom and mocks browser APIs
