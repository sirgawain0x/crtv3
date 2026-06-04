/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ORB_SESSION_CHANGE_EVENT,
  ORB_SESSION_STORAGE_KEY,
  invalidateOrbSessionCache,
  loadStoredOrbSession,
  saveStoredOrbSession,
  subscribeOrbSession,
} from './login';

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
