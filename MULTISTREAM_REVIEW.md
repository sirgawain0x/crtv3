# Multistream Functionality Review

## Overview
This document reviews the multistream functionality for the live streaming feature. The implementation allows users to stream to multiple platforms simultaneously (YouTube, Twitch, Facebook, Twitter, etc.).

## Architecture

### Components
1. **`app/live/[address]/page.tsx`** - Main live page with stream creation and multistream management
2. **`components/Live/Broadcast.tsx`** - Broadcast component with embedded multistream settings
3. **`components/Live/multicast/MultistreamTargetsForm.tsx`** - Form to add new multistream targets
4. **`components/Live/multicast/MultistreamTargetList.tsx`** - List of existing multistream targets
5. **`services/video-assets.ts`** - Service functions for multistream target CRUD operations
6. **`app/api/livepeer/livepeer-proxy/route.ts`** - API proxy for Livepeer stream creation

## Critical Issues Found

### 🔴 Issue #1: Incorrect Multistream Target Fetching
**Location**: `services/video-assets.ts:314-323`

**Problem**: The `listMultistreamTargets()` function calls `fullLivepeer.multistream.getAll()`, which returns ALL multistream targets globally across all streams, not targets for a specific stream.

```typescript
export async function listMultistreamTargets(): Promise<ListMultistreamTargetsResult> {
  try {
    const targets = await fullLivepeer.multistream.getAll(); // ❌ Returns ALL targets
    if (!Array.isArray(targets))
      return { error: "Failed to fetch multistream targets" };
    return { targets: targets as MultistreamTarget[] };
  } catch (e) {
    return { error: "Failed to fetch multistream targets" };
  }
}
```

**Impact**: 
- Users see multistream targets from other users' streams
- Incorrect targets may be included when creating new streams
- Privacy/security concern - users can see other users' streaming configurations

**Fix Required**: 
- Function should accept a `streamId` parameter
- Use `fullLivepeer.stream.get(streamId)` to get the stream, then access its multistream targets
- Or use the Livepeer API endpoint: `/stream/{streamId}` to get stream-specific targets

### 🔴 Issue #2: Stream-Specific Target Management
**Location**: Multiple files

**Problem**: Multistream targets are stream-specific, but the current implementation treats them as global resources.

**Current Flow Issues**:
1. `app/live/[address]/page.tsx` calls `listMultistreamTargets()` without a streamId
2. Targets are fetched globally before stream creation
3. When creating a stream, targets are included, but they may belong to other streams
4. After stream creation, targets should be fetched for that specific stream

**Fix Required**:
- Update `listMultistreamTargets()` to require `streamId`
- Only fetch targets after stream is created
- Update all call sites to pass `streamId`

### 🟡 Issue #3: Target Creation Timing
**Location**: `app/live/[address]/page.tsx:93-159`

**Problem**: The form allows adding targets before a stream is created, but `createMultistreamTarget()` requires a `streamId`. This creates a chicken-and-egg problem.

**Current Behavior**:
- User can add targets before creating stream
- Form requires `streamId` which doesn't exist yet
- Targets are included in initial stream creation via `multistream.targets` config

**Fix Required**:
- Option A: Disable target form until stream is created, then allow adding targets to existing stream
- Option B: Store targets temporarily in state, include them in stream creation, then create targets after stream is created
- Option C: Create stream first, then allow adding targets (recommended)

### 🟡 Issue #4: Duplicate Target Fetching Logic
**Location**: `components/Live/Broadcast.tsx`

**Problem**: Multistream targets are fetched in two places:
1. `BroadcastWithControls` component (lines 177-185)
2. `Settings` component (lines 411-419)

Both fetch targets independently, causing duplicate API calls and potential state inconsistencies.

**Fix Required**:
- Lift target state to parent component
- Pass targets as props to Settings component
- Or use a shared context/state management

### 🟡 Issue #5: Validation Inconsistency
**Location**: `services/video-assets.ts:291` and `components/Live/multicast/MultistreamTargetsForm.tsx:28-32`

**Problem**: 
- Form schema allows `name` to be optional: `z.string().optional()`
- Service function validation requires name: `if (!streamId || !name || !url)`

**Impact**: Form can submit with empty name, but API call will fail silently or return error.

**Fix Required**:
- Make name optional in service function, or
- Make name required in form schema
- Provide default name if not provided (e.g., "Target 1", "Target 2")

### 🟡 Issue #6: Missing Stream ID in Target List
**Location**: `components/Live/multicast/MultistreamTargetList.tsx`

**Problem**: The component receives targets but doesn't know which stream they belong to. When removing a target, it only uses the target ID, which could theoretically delete a target from a different stream if IDs collide.

**Fix Required**:
- Pass `streamId` to component
- Verify target belongs to stream before deletion
- Add confirmation dialog for deletion

### 🟡 Issue #7: Error Handling
**Location**: Multiple files

**Problems**:
1. Generic error messages don't provide actionable feedback
2. No retry logic for failed operations
3. Errors are logged but not always displayed to user
4. Network errors aren't distinguished from validation errors

**Examples**:
- `"Failed to create multistream target"` - doesn't say why
- `"Failed to fetch multistream targets"` - doesn't indicate if it's network or permission issue

**Fix Required**:
- Provide specific error messages
- Add error codes/types
- Show user-friendly messages
- Implement retry logic with exponential backoff

### 🟡 Issue #8: Race Conditions
**Location**: `components/Live/Broadcast.tsx:84-153`

**Problem**: The `useEffect` that creates the stream depends on `multistreamTargets`, which can change after stream creation. This could cause:
- Stream to be recreated when targets change
- Targets added after stream creation not being included
- Infinite loop if targets state updates trigger stream recreation

**Fix Required**:
- Only create stream once
- Add targets to existing stream after creation
- Use `useRef` to track if stream was already created
- Separate stream creation from target management

## Code Quality Issues

### 1. Type Safety
- `multistream: any` in `CreateStreamProxyParams` - should be properly typed
- Missing TypeScript types for Livepeer multistream API responses

### 2. Code Duplication
- Stream creation logic duplicated in `app/live/[address]/page.tsx` and `components/Live/Broadcast.tsx`
- Target fetching logic duplicated in multiple components
- Profile definitions duplicated (480p, 720p, 1080p)

### 3. Missing Features
- No way to edit existing targets (only add/remove)
- No validation of RTMP URLs before adding
- No preview/test of multistream targets
- No status indicators for target connection status
- No way to enable/disable targets without deleting

### 4. User Experience
- No loading states when fetching targets
- No success feedback when targets are added
- Form doesn't clear properly after submission
- No confirmation when removing targets
- No indication of which targets are active

## Recommendations

### High Priority
1. **Fix target fetching to be stream-specific** - This is a critical bug affecting functionality and privacy
2. **Resolve stream creation timing** - Ensure targets can only be added after stream exists
3. **Add proper error handling** - Users need feedback when operations fail
4. **Fix race conditions** - Prevent stream recreation when targets change

### Medium Priority
5. **Consolidate duplicate code** - Extract shared logic into hooks/utilities
6. **Improve type safety** - Add proper TypeScript types
7. **Add target editing** - Allow users to modify existing targets
8. **Add validation** - Validate RTMP URLs and stream keys

### Low Priority
9. **Add target status indicators** - Show connection status
10. **Add target testing** - Allow users to test targets before going live
11. **Improve UX** - Better loading states, confirmations, feedback

## Testing Recommendations

1. **Unit Tests**:
   - Test target creation with valid/invalid inputs
   - Test target listing for specific streams
   - Test target deletion
   - Test validation logic

2. **Integration Tests**:
   - Test stream creation with multistream targets
   - Test adding targets to existing stream
   - Test removing targets from active stream
   - Test error scenarios (network failures, invalid credentials)

3. **E2E Tests**:
   - Test complete flow: create stream → add targets → go live
   - Test target management during active stream
   - Test multiple users creating streams with targets

## Livepeer Documentation Context

Based on the official Livepeer documentation:
- **Multistream targets are stream-specific** - "you must configure new multistream targets for each stream"
- Targets can be created **inlined in stream creation** OR **separately using the API**
- Changes apply only to the **next active session** - changes made during an active stream won't apply until the session ends
- Targets can be **toggled on/off** without deleting
- Webhooks are available for monitoring target status (`multistream.connected`, `multistream.error`, `multistream.disconnected`)

## Summary

The multistream functionality has a solid foundation but contains several critical bugs that need immediate attention:

1. **Critical**: Target fetching returns global targets instead of stream-specific ones
2. **Critical**: Timing issues with target creation relative to stream creation
3. **Important**: Race conditions and duplicate logic causing potential bugs
4. **Important**: Poor error handling and user feedback

The implementation would benefit from:
- Proper stream-scoped target management (confirmed by Livepeer docs)
- Better state management to avoid race conditions
- Improved error handling and user feedback
- Code consolidation to reduce duplication
- Implementation of target toggle functionality (enable/disable)
- Webhook integration for target status monitoring

