/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ORB_SESSION_CHANGE_EVENT,
  ORB_SESSION_STORAGE_KEY,
  hasOrbWriteCredentials,
  invalidateOrbSessionCache,
  loadStoredOrbSession,
  normalizeOrbAuthTokens,
  saveStoredOrbSession,
  subscribeOrbSession,
} from './login';

describe('hasOrbWriteCredentials', () => {
  it('returns false when session is null or missing tokens', () => {
    expect(hasOrbWriteCredentials(null)).toBe(false);
    expect(hasOrbWriteCredentials({ accessToken: 'a' })).toBe(false);
    expect(hasOrbWriteCredentials({ refreshToken: 'r' } as never)).toBe(false);
  });

  it('returns true when both access and refresh are present', () => {
    expect(
      hasOrbWriteCredentials({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    ).toBe(true);
  });
});

describe('normalizeOrbAuthTokens', () => {
  it('maps snake_case poll fields to StoredOrbSession', () => {
    expect(
      normalizeOrbAuthTokens({
        access_token: 'at',
        refresh_token: 'rt',
        authentication_id: 'auth-1',
        id_token: 'id',
      }),
    ).toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
      authenticationId: 'auth-1',
      idToken: 'id',
    });
  });

  it('returns null when access token is missing', () => {
    expect(normalizeOrbAuthTokens({ refresh_token: 'rt' })).toBeNull();
  });

  it('access-only merge after sync is not writable', () => {
    const merged = normalizeOrbAuthTokens({ accessToken: 'new-access' });
    expect(merged).not.toBeNull();
    expect(hasOrbWriteCredentials(merged)).toBe(false);
  });
});

describe('orb session storage', () => {
  afterEach(() => {
    localStorage.clear();
    invalidateOrbSessionCache();
  });

  it('notifies subscribers when session is saved', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOrbSession(listener);

    saveStoredOrbSession({
      accessToken: 'test-token',
      authenticationId: 'auth-1',
    });

    expect(loadStoredOrbSession()?.accessToken).toBe('test-token');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('does not notify when session payload is unchanged', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOrbSession(listener);

    saveStoredOrbSession({ accessToken: 'same-token' });
    expect(listener).toHaveBeenCalledTimes(1);
    listener.mockClear();

    saveStoredOrbSession({ accessToken: 'same-token' });
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('dispatches a session change event on save and clear', () => {
    const handler = vi.fn();
    window.addEventListener(ORB_SESSION_CHANGE_EVENT, handler);

    saveStoredOrbSession({ accessToken: 'a' });
    saveStoredOrbSession(null);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(ORB_SESSION_STORAGE_KEY)).toBeNull();

    window.removeEventListener(ORB_SESSION_CHANGE_EVENT, handler);
  });

  it('returns a referentially stable snapshot until the session changes', () => {
    saveStoredOrbSession({ accessToken: 'stable-token' });

    const first = loadStoredOrbSession();
    const second = loadStoredOrbSession();

    expect(first).toBe(second);

    saveStoredOrbSession({ accessToken: 'updated-token' });

    const third = loadStoredOrbSession();
    expect(third).not.toBe(first);
    expect(third?.accessToken).toBe('updated-token');
  });
});
