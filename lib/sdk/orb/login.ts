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

/** User-facing message when access token exists but refresh is missing. */
export const ORB_INCOMPLETE_SESSION_MESSAGE =
  'Orb session is incomplete. Sign in again with Orb to post and interact.';

/** Lens writes require both access and refresh tokens (see resumeLensSessionFromOrb). */
export function hasOrbWriteCredentials(
  session: StoredOrbSession | null | undefined,
): boolean {
  if (!session) return false;
  return (
    !!session.accessToken?.trim() && !!session.refreshToken?.trim()
  );
}

/**
 * Normalize Orb QR poll / sync payloads (camelCase or snake_case from orbapi.xyz).
 */
export function normalizeOrbAuthTokens(
  raw: Record<string, unknown>,
): StoredOrbSession | null {
  const accessToken = String(
    raw.accessToken ?? raw.access_token ?? '',
  ).trim();
  if (!accessToken) return null;

  const refreshToken = String(
    raw.refreshToken ?? raw.refresh_token ?? '',
  ).trim();
  const authenticationId = String(
    raw.authenticationId ?? raw.authentication_id ?? '',
  ).trim();
  const idToken = String(raw.idToken ?? raw.id_token ?? '').trim();

  return {
    accessToken,
    refreshToken: refreshToken || undefined,
    authenticationId: authenticationId || undefined,
    idToken: idToken || undefined,
  };
}

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

  const existingRaw = localStorage.getItem(ORB_SESSION_STORAGE_KEY);

  if (!session?.accessToken) {
    if (!existingRaw) {
      return;
    }
    localStorage.removeItem(ORB_SESSION_STORAGE_KEY);
    invalidateOrbSessionCache();
    notifyOrbSessionChange();
    return;
  }

  const serialized = JSON.stringify(session);
  if (existingRaw === serialized) {
    return;
  }

  localStorage.setItem(ORB_SESSION_STORAGE_KEY, serialized);
  invalidateOrbSessionCache();
  notifyOrbSessionChange();
}

/** Drops Orb tokens and cached Lens session clients (e.g. revoked refresh). */
export function clearStoredOrbSession(): void {
  clearLensSessionCache();
  saveStoredOrbSession(null);
}
