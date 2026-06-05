import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  clearStaleOrbSessionIfNeeded,
  isIncompleteOrbSessionError,
  isStaleOrbSessionError,
} from './session-errors';

vi.mock('@/lib/sdk/orb/login', () => ({
  clearStoredOrbSession: vi.fn(),
}));

import { clearStoredOrbSession } from '@/lib/sdk/orb/login';

describe('isIncompleteOrbSessionError', () => {
  it('detects missing refresh token and incomplete session messages', () => {
    expect(
      isIncompleteOrbSessionError(
        new Error('Orb session is missing a refresh token'),
      ),
    ).toBe(true);
    expect(
      isIncompleteOrbSessionError(
        new Error('Orb session is incomplete. Sign in again'),
      ),
    ).toBe(true);
    expect(isIncompleteOrbSessionError(new Error('network error'))).toBe(false);
  });
});

describe('clearStaleOrbSessionIfNeeded', () => {
  afterEach(() => {
    vi.mocked(clearStoredOrbSession).mockClear();
  });

  it('clears storage for incomplete session errors', () => {
    const cleared = clearStaleOrbSessionIfNeeded(
      new Error('Orb session is missing a refresh token'),
    );
    expect(cleared).toBe(true);
    expect(clearStoredOrbSession).toHaveBeenCalledOnce();
  });

  it('clears storage for stale session errors', () => {
    const cleared = clearStaleOrbSessionIfNeeded(new Error('401 unauthorized'));
    expect(cleared).toBe(true);
    expect(clearStoredOrbSession).toHaveBeenCalledOnce();
  });

  it('does not clear for unrelated errors', () => {
    const cleared = clearStaleOrbSessionIfNeeded(new Error('upload failed'));
    expect(cleared).toBe(false);
    expect(clearStoredOrbSession).not.toHaveBeenCalled();
  });
});

describe('isStaleOrbSessionError', () => {
  it('includes incomplete session as stale', () => {
    expect(
      isStaleOrbSessionError(
        new Error('Orb session is missing a refresh token'),
      ),
    ).toBe(true);
  });
});
