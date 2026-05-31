import { createOrbLogin, type OrbLogin } from '@orbclub/modules/auth';
import { getOrbLoginConfig } from '@/lib/sdk/orb/config';
import { clearLensSessionCache } from '@/lib/sdk/lens/orb-session-client';

let orbLoginSingleton: OrbLogin | null = null;

export function getOrbLogin(): OrbLogin {
  if (!orbLoginSingleton) {
    orbLoginSingleton = createOrbLogin(getOrbLoginConfig());
  }
  return orbLoginSingleton;
}

export type StoredOrbSession = {
  accessToken: string;
  refreshToken?: string;
  authenticationId?: string;
  idToken?: string;
};

export const ORB_SESSION_STORAGE_KEY = 'crtv_orb_session';

/** Dispatched on the same tab when Orb session is saved or cleared. */
export const ORB_SESSION_CHANGE_EVENT = 'crtv:orb-session-change';

let cachedSession: StoredOrbSession | null = null;
let isSessionCacheValid = false;

export function invalidateOrbSessionCache(): void {
  isSessionCacheValid = false;
}

export function loadStoredOrbSession(): StoredOrbSession | null {
  if (typeof window === 'undefined') return null;
  if (isSessionCacheValid) return cachedSession;

  try {
    const raw = localStorage.getItem(ORB_SESSION_STORAGE_KEY);
    if (!raw) {
      cachedSession = null;
    } else {
      const parsed = JSON.parse(raw) as StoredOrbSession;
      cachedSession = parsed?.accessToken ? parsed : null;
    }
  } catch {
    cachedSession = null;
  }
  isSessionCacheValid = true;
  return cachedSession;
}

function notifyOrbSessionChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ORB_SESSION_CHANGE_EVENT));
}

export function subscribeOrbSession(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    invalidateOrbSessionCache();
    onStoreChange();
  };
  window.addEventListener(ORB_SESSION_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(ORB_SESSION_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function getOrbSessionServerSnapshot(): StoredOrbSession | null {
  return null;
}

export function saveStoredOrbSession(session: StoredOrbSession | null): void {
  if (typeof window === 'undefined') return;
  if (!session?.accessToken) {
    localStorage.removeItem(ORB_SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(ORB_SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  invalidateOrbSessionCache();
  notifyOrbSessionChange();
}

/** Drops Orb tokens and cached Lens session clients (e.g. revoked refresh). */
export function clearStoredOrbSession(): void {
  clearLensSessionCache();
  saveStoredOrbSession(null);
}
