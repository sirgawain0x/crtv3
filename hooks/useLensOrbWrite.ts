'use client';

import { useCallback, useMemo } from 'react';
import { useAuthModal } from '@account-kit/react';
import { useOrbSession } from '@/context/OrbSessionContext';
import { resumeLensSessionFromOrb } from '@/lib/sdk/lens/orb-session-client';
import type { SessionClient } from '@lens-protocol/client';

export type LensOrbWriteAccess = {
  /** Linked Orb + wallet profile — required for likes, join group, etc. */
  canWrite: boolean;
  /** Orb signed in but profile not linked yet */
  needsLink: boolean;
  /** No Orb session */
  needsOrbLogin: boolean;
  lensAccount: string | null;
  getSessionClient: () => Promise<SessionClient>;
  promptWriteAccess: () => void;
};

export function useLensOrbWrite(): LensOrbWriteAccess {
  const {
    session,
    syncSession,
    isAuthenticated,
    linkStatus,
    lensAccount,
    hasWallet,
    openLoginModal,
  } = useOrbSession();
  const { openAuthModal } = useAuthModal();

  const canWrite = isAuthenticated && linkStatus === 'linked';
  const needsLink = isAuthenticated && linkStatus !== 'linked';
  const needsOrbLogin = !isAuthenticated;

  const getSessionClient = useCallback(async () => {
    if (!canWrite) {
      throw new Error('Link your Orb account to interact on Lens');
    }
    if (!session?.accessToken) {
      throw new Error('Orb session expired — sign in again');
    }
    const synced = (await syncSession()) ?? session;
    return resumeLensSessionFromOrb(synced);
  }, [canWrite, session, syncSession]);

  const promptWriteAccess = useCallback(() => {
    if (!hasWallet) {
      openAuthModal();
      return;
    }
    if (needsOrbLogin || needsLink) {
      openLoginModal();
    }
  }, [needsOrbLogin, needsLink, hasWallet, openLoginModal, openAuthModal]);

  return useMemo(
    () => ({
      canWrite,
      needsLink,
      needsOrbLogin,
      lensAccount,
      getSessionClient,
      promptWriteAccess,
    }),
    [
      canWrite,
      needsLink,
      needsOrbLogin,
      lensAccount,
      getSessionClient,
      promptWriteAccess,
    ],
  );
}
