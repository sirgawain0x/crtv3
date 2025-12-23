# Development Error Handling

This directory contains utilities for handling common development-mode errors and warnings in Next.js 15 + React 19.

## Overview

When running the application in development mode, you may encounter console warnings that are safe to ignore:

1. **"signal is aborted without reason"** - Common with React 19's Strict Mode and hot module reloading
2. **Aria-hidden accessibility warnings** - From the Next.js dev overlay

These warnings are suppressed in development mode to reduce noise while debugging.

## Files

### `suppressDevWarnings.ts`

Automatically suppresses known dev-mode warnings that don't affect functionality:

- Abort signal warnings
- Aria-hidden warnings from Next.js dev overlay
- ResizeObserver warnings

**Usage:** Automatically imported in `app/providers.tsx` - no manual action required.

### `errorHandler.ts`

Provides utilities for handling fetch errors and abort signals:

#### Functions

**`isAbortError(error: unknown): boolean`**
- Checks if an error is an AbortError that can be safely ignored
- Useful for custom error handling logic

**`shouldIgnoreError(error: unknown): boolean`**
- Determines if an error should be filtered out
- Includes abort errors and dev-mode specific warnings

**`fetchWithAbortHandler<T>(input, init): Promise<T>`**
- Wrapper for fetch requests with graceful abort handling
- Example:
  ```typescript
  import { fetchWithAbortHandler } from '@/lib/utils/errorHandler';

  const data = await fetchWithAbortHandler('/api/data', {
    signal: controller.signal,
    onAbort: () => console.log('Request was cancelled')
  });
  ```

**`createAbortControllerWithTimeout(timeoutMs): AbortController`**
- Creates an AbortController that automatically aborts after a timeout
- Example:
  ```typescript
  const controller = createAbortControllerWithTimeout(5000); // 5 seconds
  fetch('/api/data', { signal: controller.signal });
  ```

## Configuration Changes

### Query Client (config.ts)

The React Query client has been updated to handle abort errors intelligently:

```typescript
retry: (failureCount, error) => {
  // Don't retry on abort errors
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }
  return failureCount < 1;
}
```

This prevents unnecessary retries when requests are legitimately cancelled.

## Why These Errors Occur

### "signal is aborted without reason"

This warning appears due to:
- **React 19 Strict Mode**: Components mount/unmount twice in development, aborting fetch requests
- **Hot Module Reloading**: Updates during development cancel in-flight requests
- **Account Kit/Livepeer SDK**: Background queries being cancelled during component updates

**Impact:** None - these are expected in development and won't appear in production.

### Aria-hidden Warning

This is a known issue with the Next.js 15 dev overlay where it tries to hide content but keeps a button focused, violating accessibility rules.

**Impact:** Purely cosmetic in development only - doesn't affect your application code.

## Production Behavior

All suppressions and dev-mode handlers check `process.env.NODE_ENV === 'development'` and won't affect production builds.

In production:
- Warnings won't be suppressed
- All errors will be logged normally
- Query retry logic still handles abort errors intelligently

## Debugging

If you need to see the suppressed warnings for debugging:

1. Comment out the import in `app/providers.tsx`:
   ```typescript
   // import "@/lib/utils/suppressDevWarnings";
   ```

2. Or modify `suppressDevWarnings.ts` to log suppressed messages:
   ```typescript
   console.debug('[Suppressed]:', ...args);
   ```

## Additional Resources

- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/query-retries)
- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

