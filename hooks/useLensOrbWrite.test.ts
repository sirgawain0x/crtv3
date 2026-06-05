import { describe, expect, it } from 'vitest';
import { hasOrbWriteCredentials } from '@/lib/sdk/orb/login';

/** Mirrors useLensOrbWrite gating (kept in sync with hooks/useLensOrbWrite.ts). */
function lensOrbWriteFlags(
  session: { accessToken: string; refreshToken?: string } | null,
  isAuthenticated: boolean,
  linkStatus: 'idle' | 'linked' | 'needs_wallet' | 'failed',
) {
  const hasWriteCredentials = hasOrbWriteCredentials(session);
  return {
    canWrite:
      isAuthenticated && linkStatus === 'linked' && hasWriteCredentials,
    needsOrbReauth:
      isAuthenticated && linkStatus === 'linked' && !hasWriteCredentials,
  };
}

describe('useLensOrbWrite gating', () => {
  it('canWrite is false when linked but refresh token is missing', () => {
    const flags = lensOrbWriteFlags(
      { accessToken: 'access-only' },
      true,
      'linked',
    );
    expect(flags.canWrite).toBe(false);
    expect(flags.needsOrbReauth).toBe(true);
  });

  it('canWrite is true when linked with full credentials', () => {
    const flags = lensOrbWriteFlags(
      { accessToken: 'access', refreshToken: 'refresh' },
      true,
      'linked',
    );
    expect(flags.canWrite).toBe(true);
    expect(flags.needsOrbReauth).toBe(false);
  });
});
