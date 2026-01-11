# Build Error Fix: WalletConnect/Reown Package Issues

## Problem

The Vercel build is failing with errors related to `@reown/appkit` (formerly WalletConnect) packages:

1. **Missing `ModalUtil` export** - Should be `ModalController`
2. **Missing `getChainsToDisconnect` export**
3. **Missing `@walletconnect/universal-provider` module**

These errors occur because:
- `@account-kit/react` uses `@wagmi/connectors`
- `@wagmi/connectors` has nested dependencies on `@reown/appkit` packages
- These packages have version mismatches causing missing exports
- Turbopack is trying to bundle these packages during server-side rendering

## Solution Applied

1. **Installed missing dependency:**
   ```bash
   yarn add @walletconnect/universal-provider
   ```

2. **Externalized packages in `next.config.mjs`:**
   Added the following packages to `serverExternalPackages`:
   - `@reown/appkit`
   - `@reown/appkit-controllers`
   - `@reown/appkit-scaffold-ui`
   - `@reown/appkit-ui`
   - `@reown/appkit-common`
   - `@reown/appkit-utils`
   - `@walletconnect/ethereum-provider`
   - `@walletconnect/universal-provider`

## Why This Happens

The `config.ts` file is imported in `app/layout.tsx` (a server component) to use `cookieToInitialState`. This causes the entire dependency chain to be evaluated during server-side rendering, including WalletConnect packages that should only run client-side.

## Next Steps

If the build still fails, consider:

1. **Update package versions:**
   ```bash
   yarn upgrade @wagmi/connectors @account-kit/react
   ```

2. **Check for peer dependency warnings** during install and ensure all required packages are installed

3. **Consider lazy loading** the config in client components only if possible

## Note

This is **not related to the React Testing Library tests** we just added. These are pre-existing dependency issues with the WalletConnect/Reown ecosystem packages.
