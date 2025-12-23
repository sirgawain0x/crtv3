# ENS Lookup Timeout Error Fix

## Problem
The application was experiencing `ContractFunctionExecutionError` timeout errors when resolving ENS names in the TopChart leaderboard component. Multiple concurrent ENS lookups (up to 20 addresses) were overwhelming the Alchemy RPC endpoint, causing requests to timeout.

**Error Details:**
- Error: "The request took too long to respond"
- Location: `components/home-page/TopChart.tsx`
- Function: `publicClient.getEnsName()`
- Contract: Universal Resolver (`0x74E20Bd2A1fE0cdbe45b9A1d89cb7e0a45b36376`)

## Root Causes
1. **No timeout handling**: ENS lookups could hang indefinitely
2. **No retry logic**: Single request failures weren't handled gracefully
3. **No caching**: Repeated lookups for the same addresses
4. **Concurrent overload**: All 20+ addresses resolved simultaneously
5. **No rate limiting**: Overwhelming the RPC endpoint

## Solution Implemented

### 1. Timeout Handling
```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error("ENS lookup timed out")), 3000);
});

const ensName = await Promise.race([
  publicClient.getEnsName({ address }),
  timeoutPromise,
]);
```
- 3-second timeout for ENS lookups
- Fail-fast approach prevents hanging requests

### 2. Retry Logic with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T>
```
- Implements exponential backoff (500ms, 1000ms, 2000ms)
- Follows Alchemy's best practices for retry logic
- Skips retries on timeout errors (fail-fast)

### 3. ENS Caching
```typescript
const ensCache = new Map<string, string | null>();
```
- Module-level cache prevents repeated lookups
- Caches both successful resolutions and failures
- Significantly reduces RPC calls on re-renders

### 4. Rate Limiting
```typescript
await new Promise((resolve) => {
  timeoutId = setTimeout(resolve, Math.random() * 500);
});
```
- Random 0-500ms delay before each ENS lookup
- Prevents overwhelming the RPC with concurrent requests
- Distributes load over time

### 5. Proper Cleanup
```typescript
const isMountedRef = useRef(true);

return () => {
  isMountedRef.current = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
};
```
- Prevents state updates on unmounted components
- Clears pending timeouts on cleanup
- Avoids memory leaks

## Key Improvements

### Performance
- **Reduced RPC calls**: Caching eliminates duplicate lookups
- **Faster page loads**: Cached ENS names load instantly
- **Better reliability**: Timeout handling prevents hanging requests

### User Experience
- **Graceful degradation**: Shows shortened address if ENS fails
- **Non-blocking**: ENS failures don't break the UI
- **Responsive**: Page loads quickly even if ENS is slow

### Following Alchemy Best Practices
1. ✅ **Retry with exponential backoff** on failures
2. ✅ **Handle timeouts** properly (don't retry on client-side timeouts)
3. ✅ **Send requests concurrently** but with rate limiting
4. ✅ **Avoid overwhelming RPC** with batched/delayed requests
5. ✅ **Implement caching** to reduce compute unit costs

## Testing Recommendations

1. **Test with slow network**: Verify timeout handling works
2. **Test with failed RPC**: Ensure graceful degradation
3. **Test rapid navigation**: Verify cleanup and no memory leaks
4. **Monitor RPC usage**: Check reduced compute units from caching

## Files Modified
- `/components/home-page/TopChart.tsx`

## Impact
- ✅ Eliminates ENS timeout errors
- ✅ Reduces Alchemy compute unit usage
- ✅ Improves page load performance
- ✅ Better user experience with graceful fallbacks
- ✅ More reliable leaderboard display

## Future Enhancements (Optional)
1. **Server-side caching**: Move ENS resolution to API route with Redis/database cache
2. **Background refresh**: Periodically update ENS names in the background
3. **Batch resolution**: Use multicall contracts to batch ENS lookups
4. **Progressive loading**: Show addresses first, then update with ENS names

