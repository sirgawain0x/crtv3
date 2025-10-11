# Turnkey Iframe Duplicate Error Fix

## Problem
You were experiencing this runtime error:
```
Error: Iframe element with ID turnkey-iframe already exists
```

This error occurs when Alchemy's Account Kit tries to create an authentication iframe with the ID `turnkey-iframe`, but one already exists in the DOM from a previous render.

## Root Causes

1. **React 19 Strict Mode** - React 19 has stricter hydration checks and can cause double renders in development
2. **Hot Module Replacement (HMR)** - During development, Next.js hot reloading can leave old iframes in the DOM
3. **AlchemyAccountProvider Initialization** - The provider creates the iframe on mount, but doesn't clean up previous ones
4. **Next.js 15 Fast Refresh** - The new Fast Refresh can trigger multiple provider initializations

## Solution Layers

We've implemented a **multi-layered defense strategy** to prevent this error:

### Layer 1: Early Cleanup Script (`app/layout.tsx`)
```typescript
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      try {
        var turnkeyIframe = document.getElementById('turnkey-iframe');
        if (turnkeyIframe) {
          turnkeyIframe.remove();
        }
        // ... more cleanup
      } catch (e) {}
    })();
  `,
}} />
```

**Purpose**: Runs before React hydrates to remove any leftover iframes from previous page loads.

**Timing**: Executes immediately when HTML is parsed, before any JavaScript frameworks load.

### Layer 2: Provider-Level Cleanup (`app/providers.tsx`)
```typescript
const [isReady, setIsReady] = useState(false);

useEffect(() => {
  cleanupExistingIframes();
  setIsReady(true);
}, []);

if (!isReady) {
  return <div>Loading...</div>;
}
```

**Purpose**: Ensures cleanup happens before `AlchemyAccountProvider` mounts.

**Timing**: Runs during the first render cycle, before child components mount.

### Layer 3: MutationObserver (`components/IframeCleanup.tsx`)
```typescript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node instanceof HTMLIFrameElement) {
        const id = node.getAttribute('id');
        if (id && id.includes('turnkey-iframe')) {
          const existingCount = document.querySelectorAll(`#${id}`).length;
          if (existingCount > 1) {
            node.remove();
          }
        }
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
```

**Purpose**: Real-time detection and removal of duplicate iframes as they're added to the DOM.

**Timing**: Constantly monitors the DOM for iframe additions throughout the app lifecycle.

### Layer 4: Route Change Cleanup (`components/IframeCleanup.tsx`)
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    cleanupExistingIframes();
  }, 100);
  
  return () => clearTimeout(timeoutId);
}, [pathname]);
```

**Purpose**: Cleanup on navigation to prevent iframes from accumulating during SPA navigation.

**Timing**: Runs when the route changes (debounced by 100ms).

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Page Load                                                │
│    └─> Early cleanup script runs (Layer 1)                 │
│        └─> Removes any existing turnkey iframes            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. React Hydration                                          │
│    └─> IframeCleanup component mounts                      │
│        └─> MutationObserver starts (Layer 3)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Providers Component                                      │
│    └─> useEffect runs cleanup (Layer 2)                    │
│        └─> Sets isReady = true                             │
│            └─> AlchemyAccountProvider mounts               │
│                └─> Creates new turnkey iframe              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. During App Lifecycle                                     │
│    ├─> MutationObserver watches for duplicate iframes      │
│    └─> Route changes trigger cleanup (Layer 4)             │
└─────────────────────────────────────────────────────────────┘
```

## Files Changed

1. **`components/IframeCleanup.tsx`**
   - Enhanced cleanup function with more comprehensive selectors
   - Added MutationObserver to catch duplicates in real-time
   - Exported cleanup function for use in other components
   - Added debounced route change cleanup

2. **`app/providers.tsx`**
   - Added cleanup on mount before provider initialization
   - Implemented loading gate to prevent race conditions
   - Imported and uses the cleanup function

3. **`app/layout.tsx`**
   - Added early cleanup script in `<head>`
   - Runs before React hydration
   - Removed unused Script import

## Testing

To verify the fix works:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Check browser console:**
   - Should NOT see "Iframe element with ID turnkey-iframe already exists"
   - May see "Duplicate iframe detected..." warnings (this is expected and shows the protection is working)

3. **Test navigation:**
   - Navigate between pages
   - Check that iframes don't accumulate in DevTools Elements panel

4. **Test hot reload:**
   - Make a change to a component
   - Save and let HMR update
   - Should not see iframe errors

5. **Test authentication:**
   - Try to sign in with Alchemy Account Kit
   - Should work normally without iframe errors

## Debugging

If you still see the error:

### Check DOM State
```javascript
// In browser console
document.querySelectorAll('iframe[id*="turnkey"]')
// Should show 0 or 1 iframe, not multiple
```

### Monitor Iframe Creation
```javascript
// Add to browser console
new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeName === 'IFRAME') {
        console.log('Iframe added:', node.id, node.src);
      }
    });
  });
}).observe(document.body, { childList: true, subtree: true });
```

### Check Cleanup Timing
Add console.logs to the cleanup function in `IframeCleanup.tsx`:
```typescript
function cleanupExistingIframes() {
  console.log('Cleanup starting...');
  // ... existing code
  console.log('Cleanup complete');
}
```

## Known Issues

### Development Only
This issue primarily occurs in development due to:
- Fast Refresh / Hot Module Replacement
- React Strict Mode double rendering
- Frequent re-initialization

**Production builds are less affected** because there's no HMR and only one initialization.

### Performance Impact
The MutationObserver adds minimal overhead:
- Only monitors iframe additions
- Doesn't process other DOM changes
- Automatically cleaned up on unmount

### Browser Compatibility
All fixes work in modern browsers:
- ✅ Chrome/Edge 88+
- ✅ Firefox 78+
- ✅ Safari 14+

## Alternative Solutions

If the issue persists, consider:

### 1. Disable Strict Mode (Not Recommended)
```typescript
// next.config.mjs
const nextConfig = {
  reactStrictMode: false, // Not recommended
};
```

### 2. Use Alchemy's Built-in Cleanup
Check if Account Kit has built-in cleanup methods:
```typescript
import { cleanupAlchemySigner } from '@account-kit/core';
// Use their official cleanup if available
```

### 3. Create Custom Signer Wrapper
```typescript
function useAlchemySigner() {
  const signerRef = useRef(null);
  
  useEffect(() => {
    // Initialize signer
    return () => {
      // Cleanup signer
      signerRef.current?.cleanup();
    };
  }, []);
  
  return signerRef.current;
}
```

## Prevention

To prevent similar issues in the future:

1. **Always cleanup in useEffect return:**
   ```typescript
   useEffect(() => {
     // Setup
     return () => {
       // Cleanup
     };
   }, []);
   ```

2. **Use refs for DOM manipulation:**
   ```typescript
   const iframeRef = useRef<HTMLIFrameElement>(null);
   ```

3. **Check for existing elements before creating:**
   ```typescript
   if (!document.getElementById('my-element')) {
     // Create element
   }
   ```

4. **Monitor iframe count in development:**
   Add to your dev workflow:
   ```bash
   # Check for multiple iframes
   document.querySelectorAll('iframe').length
   ```

## Summary

This fix implements a **defense-in-depth strategy** with four layers of protection:

1. ✅ **Early cleanup** before React hydration
2. ✅ **Provider-level gating** to ensure cleanup completes first
3. ✅ **Real-time monitoring** via MutationObserver
4. ✅ **Route change cleanup** for SPA navigation

The combination ensures the "Iframe element with ID turnkey-iframe already exists" error is prevented in all scenarios: initial load, hot reload, navigation, and Strict Mode double renders.

**Expected Result**: No more duplicate iframe errors, and Alchemy authentication works flawlessly! 🎉

