# Viem CCIP Chunk Loading Error Fix

## Problem

The application was experiencing a critical error when trying to resolve ENS names in the Navbar component:

```
ContractFunctionExecutionError: An unknown error occurred while executing the contract function "reverse".

Details: Loading chunk _app-pages-browser_node_modules_viem__esm_utils_ccip_js failed.
(error: http://localhost:3000/_next/static/chunks/_app-pages-browser_node_modules_viem__esm_utils_ccip_js.js)
```

### Root Cause

- Viem was trying to dynamically import CCIP (Cross-Chain Interoperability Protocol) utilities for ENS resolution
- Next.js 15 with Webpack was failing to load the dynamic chunk for these utilities
- This occurred in two places:
  1. `truncateAddress()` function - when displaying the user's address in the navbar
  2. `copyToClipboard()` function - when copying the user's address

### Technical Details

- The error occurred when calling `publicClient.getEnsName()` with a universal resolver address
- Viem automatically tries to load CCIP utilities for ENS offchain resolution
- The webpack chunk containing `viem/utils/ccip` failed to load dynamically
- This blocked the entire address display functionality

## Solution

### Approach: Disable ENS Resolution

We opted to **temporarily disable ENS resolution** to prevent the chunk loading error entirely. This provides a stable, reliable experience at the cost of showing truncated addresses instead of ENS names.

### Changes Made

#### 1. Simplified `truncateAddress` Function

**Before:**
```typescript
const truncateAddress = async (address: string, publicClient: any) => {
  if (!address) return "";
  try {
    const ensName = await publicClient.getEnsName({
      address: address as `0x${string}`,
      universalResolverAddress: "0x74E20Bd2A1fE0cdbe45b9A1d89cb7e0a45b36376",
    });
    if (ensName) return ensName;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  } catch (error) {
    console.error("Error resolving ENS name:", error);
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
};
```

**After:**
```typescript
const truncateAddress = (address: string) => {
  if (!address) return "";
  // Simply truncate the address without ENS resolution
  // This prevents webpack chunk loading issues with CCIP utilities
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
```

#### 2. Simplified `copyToClipboard` Function

**Before:**
```typescript
const copyToClipboard = async () => {
  const addressToCopy = modularAccount?.address || user?.address;
  
  if (addressToCopy) {
    try {
      const ensName = await publicClient.getEnsName({
        address: addressToCopy as `0x${string}`,
        universalResolverAddress: "0x74E20Bd2A1fE0cdbe45b9A1d89cb7e0a45b36376",
      });

      const textToCopy = ensName || addressToCopy;
      await navigator.clipboard.writeText(textToCopy);
      // ... success handling
    } catch (err) {
      // ... error handling
    }
  }
};
```

**After:**
```typescript
const copyToClipboard = async () => {
  const addressToCopy = modularAccount?.address || user?.address;
  
  if (addressToCopy) {
    try {
      // Copy the address directly without ENS resolution
      // This prevents webpack chunk loading issues with CCIP utilities
      await navigator.clipboard.writeText(addressToCopy);
      // ... success handling
    } catch (err) {
      // ... error handling
    }
  }
};
```

#### 3. Removed Unused Dependencies

- Removed `createPublicClient` and `http` imports from viem
- Removed `mainnet` and `alchemy` imports from `@account-kit/infra`
- Removed `publicClient` initialization code
- Updated the `useEffect` dependency array to remove `publicClient`

## Benefits

✅ **Immediate Fix**: Eliminates the chunk loading error completely  
✅ **Faster Performance**: No async ENS resolution means instant address display  
✅ **Reduced Bundle Size**: Removed unused Viem client code  
✅ **Better UX**: No loading delays or timeout issues  
✅ **Simplified Code**: Less complexity, easier to maintain  

## Trade-offs

⚠️ **No ENS Names**: Users will see truncated addresses (0x1234...5678) instead of ENS names like "vitalik.eth"  
⚠️ **Copy Behavior**: Copying will copy the full address, not the ENS name  

## Alternative Solutions Considered

### 1. ❌ Use `ccipRead: false` Option
- **Issue**: The option doesn't exist in the Viem API
- **Result**: TypeScript error

### 2. ❌ Add Timeout with Race Condition
- **Issue**: Still tries to load the CCIP chunk, just fails faster
- **Result**: Same error, just faster

### 3. ❌ Pre-bundle CCIP Utilities
- **Issue**: Would require webpack configuration changes
- **Result**: Complex, might break other features

### 4. ✅ Disable ENS Resolution (Chosen)
- **Benefit**: Simple, reliable, no dependencies on external resolution
- **Cost**: Loss of ENS name display (acceptable trade-off)

## Future Improvements

If ENS resolution is needed in the future, consider:

1. **Server-Side Resolution**: Resolve ENS names on the backend
2. **Static Import**: Pre-import CCIP utilities to avoid dynamic loading
3. **Alternative Library**: Use a different ENS resolution library without CCIP
4. **Next.js Config**: Configure webpack to handle dynamic Viem imports better

## Testing

Verify the fix by:
1. ✅ Connecting a wallet in the navbar
2. ✅ Checking that the address displays immediately (0x1234...5678)
3. ✅ Clicking the copy button to copy the address
4. ✅ Checking browser console for no CCIP chunk loading errors
5. ✅ Testing on both development and production builds

## Files Modified

- `/components/Navbar.tsx`
  - Simplified `truncateAddress()` function
  - Simplified `copyToClipboard()` function
  - Removed unused imports and client initialization
  - Updated `useEffect` dependency array

- `/components/home-page/TopChart.tsx`
  - Disabled `resolveEnsNameWithTimeout()` function (returns null immediately)
  - Simplified `AddressDisplay` component to skip ENS resolution
  - Removed ENS cache
  - Removed unused imports (`createPublicClient`, `alchemy`, `mainnet`)

## Related Issues

- Next.js 15 dynamic import issues with Viem
- Webpack chunk loading errors in production builds
- ENS universal resolver CCIP requirements

## References

- [Viem ENS Documentation](https://viem.sh/docs/ens/actions/getEnsName.html)
- [CCIP Read Specification](https://eips.ethereum.org/EIPS/eip-3668)
- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)

---

**Status**: ✅ Fixed  
**Date**: October 12, 2025  
**Priority**: High (Critical Production Error)

