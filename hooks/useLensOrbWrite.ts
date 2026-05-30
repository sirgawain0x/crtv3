'use client';

import { useCallback, useMemo } from 'react';
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
  const orb = useOrbSession();

  const canWrite = orb.isAuthenticated && orb.linkStatus === 'linked';
  const needsLink =
    orb.isAuthenticated && orb.linkStatus !== 'linked';
  const needsOrbLogin = !orb.isAuthenticated;

  const getSessionClient = useCallback(async () => {
    if (!canWrite) {
      throw new Error('Link your Orb account to interact on Lens');
    }
    const active = orb.session;
    if (!active?.accessToken) {
      throw new Error('Orb session expired — sign in again');
    }
    const synced = (await orb.syncSession()) ?? active;
    return resumeLensSessionFromOrb(synced);
  }, [canWrite, orb]);

  const promptWriteAccess = useCallback(() => {
    if (needsOrbLogin) {
      if (!orb.hasWallet) {
        orb.openLoginModal();
        return;
      }
      orb.openLoginModal();
      return;
    }
    if (needsLink) {
      orb.openLoginModal();
    }
  }, [needsOrbLogin, needsLink, orb]);

  return useMemo(
    () => ({
      canWrite,
      needsLink,
      needsOrbLogin,
      lensAccount: orb.lensAccount,
      getSessionClient,
      promptWriteAccess,
    }),
    [
      canWrite,
      needsLink,
      needsOrbLogin,
      orb.lensAccount,
      getSessionClient,
      promptWriteAccess,
    ],
  );
}
