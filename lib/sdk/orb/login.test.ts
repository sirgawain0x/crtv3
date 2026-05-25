/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ORB_SESSION_CHANGE_EVENT,
  ORB_SESSION_STORAGE_KEY,
  loadStoredOrbSession,
  saveStoredOrbSession,
  subscribeOrbSession,
} from './login';

describe('orb session storage', () => {
  afterEach(() => {
    localStorage.clear();
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

  it('dispatches a session change event on save and clear', () => {
    const handler = vi.fn();
    window.addEventListener(ORB_SESSION_CHANGE_EVENT, handler);

    saveStoredOrbSession({ accessToken: 'a' });
    saveStoredOrbSession(null);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(ORB_SESSION_STORAGE_KEY)).toBeNull();

    window.removeEventListener(ORB_SESSION_CHANGE_EVENT, handler);
  });
});
