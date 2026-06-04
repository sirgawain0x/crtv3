'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useUser } from '@account-kit/react';
import useModularAccount from '@/lib/hooks/accountkit/useModularAccount';
import {
  getOrbLogin,
  loadStoredOrbSession,
  saveStoredOrbSession,
  clearStoredOrbSession,
  subscribeOrbSession,
  getOrbSessionServerSnapshot,
  type StoredOrbSession,
} from '@/lib/sdk/orb/login';
import { useWalletAuth } from '@/lib/auth/useWalletAuth';
import { formatOrbAuthError } from '@/lib/sdk/orb/format-auth-error';
import { isStaleOrbSessionError } from '@/lib/sdk/orb/session-errors';
import { toast } from 'sonner';

export type OrbLinkStatus = 'idle' | 'linked' | 'needs_wallet' | 'failed';

const ORB_QR_AUTH_TIMEOUT_MS = 120_000;
const ORB_SESSION_SYNC_TIMEOUT_MS = 15_000;
const ORB_WALLET_SIGNATURE_TIMEOUT_MS = 45_000;
const ORB_PROFILE_LINK_TIMEOUT_MS = 30_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
  onTimeout?: () => void,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    timeout = setTimeout(() => {
      onTimeout?.();
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        if (timeout) clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        if (timeout) clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

type OrbSessionContextValue = {
  session: StoredOrbSession | null;
  lensAccount: string | null;
  isAuthenticated: boolean;
  isLinking: boolean;
  isLoginModalOpen: boolean;
  loginError: string | null;
  linkStatus: OrbLinkStatus;
  hasWallet: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  clearLoginError: () => void;
  connectWithQr: (onInit?: (payload: { qrCode: string; deepLink?: string }) => void) => Promise<void>;
  logout: () => Promise<void>;
  syncSession: () => Promise<StoredOrbSession | null>;
  linkProfile: (
    ownerAddress?: string,
    sessionOverride?: StoredOrbSession,
  ) => Promise<void>;
  /** Bumped after Orb sign-in so account menus can reopen with fresh state. */
  accountMenuRefreshSignal: number;
};

const OrbSessionContext = createContext<OrbSessionContextValue | null>(null);

export function OrbSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(
    subscribeOrbSession,
    loadStoredOrbSession,
    getOrbSessionServerSnapshot,
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<OrbLinkStatus>('idle');
  const [accountMenuRefreshSignal, setAccountMenuRefreshSignal] = useState(0);
  const user = useUser();
  const { account: modularAccount } = useModularAccount();
  const { getAuthHeaders } = useWalletAuth();
  const orb = useMemo(() => getOrbLogin(), []);

  const walletAddress = modularAccount?.address || user?.address || null;
  const hasWallet = !!walletAddress;

  const lensAccount = useMemo(() => {
    if (!session?.accessToken) return null;
    return orb.getAccountFromAccessToken(session.accessToken);
  }, [session, orb]);

  const persistSession = useCallback((next: StoredOrbSession | null) => {
    saveStoredOrbSession(next);
  }, []);

  const invalidateOrbSession = useCallback(
    (options?: { notify?: boolean }) => {
      clearStoredOrbSession();
      setLoginError(null);
      setLinkStatus('idle');
      if (options?.notify !== false) {
        toast.info(
          'Your Orb session ended. Sign in again to like posts and join groups.',
        );
      }
    },
    [],
  );

  const bumpAccountMenuRefresh = useCallback(() => {
    setAccountMenuRefreshSignal((n) => n + 1);
  }, []);

  const syncSession = useCallback(async () => {
    if (!session?.accessToken) return null;
    try {
      const synced = await withTimeout(
        orb.syncSession({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          authenticationId: session.authenticationId,
        }),
        ORB_SESSION_SYNC_TIMEOUT_MS,
        'Orb session refresh timed out. Try again in a moment.',
      );
      if (!synced?.accessToken) {
        invalidateOrbSession();
        return null;
      }
      const stored: StoredOrbSession = {
        accessToken: synced.accessToken,
        refreshToken: synced.refreshToken ?? session.refreshToken,
        authenticationId: synced.authenticationId ?? session.authenticationId,
        idToken: synced.idToken ?? session.idToken,
      };
      persistSession(stored);
      return stored;
    } catch (err) {
      if (isStaleOrbSessionError(err)) {
        invalidateOrbSession();
        return null;
      }
      return session;
    }
  }, [session, orb, persistSession, invalidateOrbSession]);

  /** Reset link UI when tokens were cleared outside this provider (e.g. Songchain feed). */
  useEffect(() => {
    if (!session?.accessToken && linkStatus === 'linked') {
      setLinkStatus('idle');
    }
  }, [session?.accessToken, linkStatus]);

  /** Clear revoked/expired Orb tokens so Songchain and feeds stay read-only instead of erroring. */
  useEffect(() => {
    if (!session?.accessToken) return;
    void syncSession();
  }, [session?.accessToken, syncSession]);

  const linkProfile = useCallback(
    async (ownerAddress?: string, sessionOverride?: StoredOrbSession) => {
      const active = sessionOverride ?? session ?? loadStoredOrbSession();
      if (!active?.accessToken) return;

      const wallet = (
        ownerAddress ||
        modularAccount?.address ||
        user?.address ||
        undefined
      )?.toLowerCase();

      if (!wallet) {
        setLinkStatus('needs_wallet');
        const message = formatOrbAuthError(
          'Connect your wallet with Get Started before linking your Lens identity.',
        );
        setLoginError(message);
        toast.error(message);
        return;
      }

      setIsLinking(true);
      try {
        let authHeaders: Record<string, string>;
        try {
          authHeaders = await withTimeout(
            getAuthHeaders(),
            ORB_WALLET_SIGNATURE_TIMEOUT_MS,
            'Wallet signature timed out. Try again and approve the signature prompt.',
          );
        } catch (signErr) {
          setLinkStatus('failed');
          const message = formatOrbAuthError(signErr);
          setLoginError(message);
          toast.error(message);
          return;
        }

        const controller = new AbortController();
        const res = await withTimeout(
          fetch('/api/creator-profiles/link-orb', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            signal: controller.signal,
            body: JSON.stringify({
              accessToken: active.accessToken,
              authenticationId: active.authenticationId,
              owner_address: wallet,
            }),
          }),
          ORB_PROFILE_LINK_TIMEOUT_MS,
          'Linking Orb to your wallet timed out. Try Sync profile again.',
          () => controller.abort(),
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to link Orb profile');
        }
        setLinkStatus('linked');
        setLoginError(null);
        toast.success('Orb / Lens identity linked to your profile');
      } catch (err) {
        setLinkStatus('failed');
        const message = formatOrbAuthError(err);
        setLoginError(message);
        toast.error(message);
      } finally {
        setIsLinking(false);
      }
    },
    [session, modularAccount?.address, user?.address, getAuthHeaders],
  );

  useEffect(() => {
    if (!session?.accessToken || !walletAddress) return;
    if (linkStatus !== 'needs_wallet') return;
    void linkProfile(walletAddress);
  }, [session?.accessToken, walletAddress, linkStatus, linkProfile]);

  /** Restore link status after refresh when profile was already linked server-side. */
  useEffect(() => {
    if (!session?.accessToken || !walletAddress || !lensAccount) return;
    if (linkStatus === 'linked' || linkStatus === 'needs_wallet') return;

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/api/creator-profiles?owner=${encodeURIComponent(walletAddress)}`,
          { signal: controller.signal },
        );
        const json = await res.json();
        if (!json?.success || !json.data?.lens_account_id) return;
        const storedLens = String(json.data.lens_account_id).toLowerCase();
        if (storedLens === lensAccount.toLowerCase()) {
          setLinkStatus('linked');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Non-fatal: user can still use Sync profile / Link Orb
      }
    })();

    return () => {
      controller.abort();
    };
  }, [session?.accessToken, walletAddress, lensAccount, linkStatus]);

  const connectWithQr = useCallback(
    async (onInit?: (payload: { qrCode: string; deepLink?: string }) => void) => {
      setLoginError(null);
      try {
        const result = await withTimeout(
          orb.connectWithQr({
            onInit: (payload) => {
              onInit?.({ qrCode: payload.qrCode, deepLink: payload.deepLink });
            },
          }),
          ORB_QR_AUTH_TIMEOUT_MS,
          'QR sign-in timed out. Try again or cancel.',
        );

        const stored: StoredOrbSession = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          authenticationId: result.authenticationId,
          idToken: result.idToken,
        };
        persistSession(stored);
        setIsLoginModalOpen(false);
        bumpAccountMenuRefresh();
        toast.success('Signed in with Orb');

        const wallet = modularAccount?.address || user?.address;
        if (wallet) {
          await linkProfile(wallet, stored);
        } else {
          setLinkStatus('needs_wallet');
          toast.info(
            'Orb connected. Use Get Started to connect your wallet, then sync your profile.',
          );
        }
      } catch (err) {
        const message = formatOrbAuthError(err);
        setLoginError(message);
        throw new Error(message);
      }
    },
    [orb, persistSession, bumpAccountMenuRefresh, modularAccount?.address, user?.address, linkProfile],
  );

  const logout = useCallback(async () => {
    if (session?.authenticationId && session.accessToken) {
      try {
        await orb.revoke({
          authenticationId: session.authenticationId,
          accessToken: session.accessToken,
        });
      } catch {
        // still clear local session
      }
    }
    clearStoredOrbSession();
    setLoginError(null);
    setLinkStatus('idle');
    toast.success('Signed out of Orb');
  }, [session, orb]);

  const openLoginModal = useCallback(() => {
    if (!hasWallet) {
      const message = formatOrbAuthError(
        'Connect your wallet with Get Started before linking your Lens identity.',
      );
      toast.info(message);
      return;
    }
    setLoginError(null);
    setIsLoginModalOpen(true);
  }, [hasWallet]);

  const value = useMemo<OrbSessionContextValue>(
    () => ({
      session,
      lensAccount,
      isAuthenticated: !!session?.accessToken,
      isLinking,
      isLoginModalOpen,
      loginError,
      linkStatus,
      hasWallet,
      openLoginModal,
      closeLoginModal: () => setIsLoginModalOpen(false),
      clearLoginError: () => setLoginError(null),
      connectWithQr,
      logout,
      syncSession,
      linkProfile,
      accountMenuRefreshSignal,
    }),
    [
      session,
      lensAccount,
      isLinking,
      isLoginModalOpen,
      loginError,
      linkStatus,
      hasWallet,
      openLoginModal,
      connectWithQr,
      logout,
      syncSession,
      linkProfile,
      accountMenuRefreshSignal,
    ],
  );

  return (
    <OrbSessionContext.Provider value={value}>{children}</OrbSessionContext.Provider>
  );
}

export function useOrbSession(): OrbSessionContextValue {
  const ctx = useContext(OrbSessionContext);
  if (!ctx) {
    throw new Error('useOrbSession must be used within OrbSessionProvider');
  }
  return ctx;
}
