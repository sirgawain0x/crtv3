import { describe, expect, it } from 'vitest';
import { sanitizeProviderFailureReason } from './provider-failure';

describe('sanitizeProviderFailureReason', () => {
  it('redacts URLs and bounds length', () => {
    const reason = sanitizeProviderFailureReason({
      phase: 'failed',
      providerStatus: 'TRANSCODE_ERROR see https://cdn.example/signed?jwt=SECRET',
    });
    expect(reason).not.toContain('https://');
    expect(reason).toContain('TRANSCODE_ERROR');
    expect(reason.length).toBeLessThanOrEqual(500);
  });
});