# Hydration Error Fix - Service Worker Script

## Issue
The application was experiencing a React hydration mismatch error in `app/layout.tsx` at line 58. The error occurred because:

1. A `<script>` tag with `dangerouslySetInnerHTML` was placed in the `<head>` element
2. Browser extensions (like Meteor) were injecting their own scripts into the `<head>`
3. This caused a mismatch between server-rendered HTML and client-rendered HTML

## Error Message
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

The diff showed:
- Server side: `__html: "\n if ('serviceWorker' in navigator) {..."`
- Client side: Additional scripts injected by browser extension

## Solution

### Changes Made to `app/layout.tsx`

1. **Added Next.js Script import**
   ```tsx
   import Script from "next/script";
   ```

2. **Moved script from `<head>` to `<body>`**
   - Removed the raw `<script>` tag with `dangerouslySetInnerHTML` from `<head>`
   - Replaced it with Next.js `<Script>` component in `<body>`

3. **Used proper Script component configuration**
   ```tsx
   <Script
     id="service-worker-cleanup"
     strategy="beforeInteractive"
     dangerouslySetInnerHTML={{
       __html: `
         if ('serviceWorker' in navigator) {
           // ... service worker cleanup code
         }
       `,
     }}
   />
   ```

## Why This Fixes the Issue

1. **Next.js Script Component**: The `<Script>` component is designed to handle hydration correctly and avoid mismatches between server and client rendering.

2. **beforeInteractive Strategy**: This ensures the script runs before the page becomes interactive, which is exactly what we need for service worker cleanup.

3. **Body Placement**: Moving the script from `<head>` to `<body>` reduces the chance of conflicts with browser extensions that typically inject scripts into `<head>`.

4. **Unique ID**: The `id="service-worker-cleanup"` prop ensures Next.js can properly track and manage this script.

5. **suppressHydrationWarning**: The existing `suppressHydrationWarning` on the `<html>` tag helps handle any remaining minor discrepancies from browser extensions.

## Benefits

- ✅ Eliminates hydration mismatch errors
- ✅ Maintains service worker cleanup functionality
- ✅ Better handling of browser extension script injection
- ✅ Follows Next.js best practices
- ✅ More reliable page hydration

## Testing

After this fix:
1. The hydration error should no longer appear in the console
2. Service workers will still be properly unregistered
3. The page should hydrate without warnings
4. Browser extensions should no longer cause hydration conflicts

## Related Files
- `/Users/gawainbracyii/Developer/latest-crtv3/app/layout.tsx`

## References
- [Next.js Script Component Documentation](https://nextjs.org/docs/app/api-reference/components/script)
- [React Hydration Mismatch](https://react.dev/link/hydration-mismatch)

