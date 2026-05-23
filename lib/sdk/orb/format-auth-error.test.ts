import { describe, expect, it } from 'vitest';
import { formatOrbAuthError } from './format-auth-error';

describe('formatOrbAuthError', () => {
  it('maps access denied to friendly copy', () => {
    expect(formatOrbAuthError(new Error('Access denied'))).toMatch(/security checks/i);
    expect(formatOrbAuthError(new Error('Access denied'))).not.toMatch(/VPN/i);
  });

  it('maps upstream failures', () => {
    expect(formatOrbAuthError('Failed to reach Orb sign-in service')).toMatch(
      /temporarily unavailable/i,
    );
  });

  it('maps wallet link prerequisites', () => {
    expect(formatOrbAuthError('Sign in with your wallet to link your profile.')).toMatch(
      /Get Started/i,
    );
  });
});
