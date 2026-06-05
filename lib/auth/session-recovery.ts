import { clearStoredOrbSession } from '@/lib/sdk/orb/login';

export type SessionResetHandlers = {
  walletLogout: () => Promise<void>;
  orbLogout: () => Promise<void>;
};

/** Clears Orb tokens, wallet session, and reloads to home. */
export async function resetAppSession(handlers: SessionResetHandlers): Promise<void> {
  try {
    await handlers.orbLogout();
  } catch {
    clearStoredOrbSession();
  }
  try {
    await handlers.walletLogout();
  } catch {
    // Wallet logout may fail if already disconnected
  }
  if (typeof window !== 'undefined') {
    window.location.assign('/');
  }
}
