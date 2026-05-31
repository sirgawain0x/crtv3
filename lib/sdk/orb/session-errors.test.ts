/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearStaleOrbSessionIfNeeded,
  getOrbErrorMessage,
  isRevokedOrbSessionError,
  isStaleOrbSessionError,
} from './session-errors';
import { ORB_SESSION_STORAGE_KEY } from './login';

describe('getOrbErrorMessage', () => {
  afterEach(() => {
    localStorage.clear();
  });
  it('reads message from plain objects', () => {
    expect(getOrbErrorMessage({ message: 'GraphQL failure' })).toBe(
      'GraphQL failure',
    );
  });
});

describe('isRevokedOrbSessionError', () => {
  it('detects Lens revoked refresh copy', () => {
    expect(
      isRevokedOrbSessionError(
        new Error('You are trying to renew a revoked authentication'),
      ),
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isRevokedOrbSessionError(new Error('Network request failed'))).toBe(
      false,
    );
  });
});

describe('isStaleOrbSessionError', () => {
  it('detects 401 and unauthorized', () => {
    expect(isStaleOrbSessionError(new Error('401 Unauthorized'))).toBe(true);
    expect(isStaleOrbSessionError(new Error('invalid orb access token'))).toBe(
      true,
    );
  });
});

describe('clearStaleOrbSessionIfNeeded', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('clears storage for stale sessions', () => {
    localStorage.setItem(
      ORB_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: 'stale' }),
    );

    expect(
      clearStaleOrbSessionIfNeeded(
        new Error('You are trying to renew a revoked authentication'),
      ),
    ).toBe(true);
    expect(localStorage.getItem(ORB_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('does not clear for unrelated errors', () => {
    localStorage.setItem(
      ORB_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: 'keep' }),
    );

    expect(clearStaleOrbSessionIfNeeded(new Error('Network failed'))).toBe(
      false,
    );
    expect(localStorage.getItem(ORB_SESSION_STORAGE_KEY)).not.toBeNull();
    localStorage.removeItem(ORB_SESSION_STORAGE_KEY);
  });
});
