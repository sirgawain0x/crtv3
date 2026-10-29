import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  classifyGasError,
  isSponsorFallbackEligible,
  PROVISIONAL_GAS_ERROR_MATCHERS,
  redactGasErrorLogBody,
  GAS_ERROR_LOG_MAX_LENGTH,
} from './classifyGasError';
import { logger } from '@/lib/utils/logger';
import { reportUnexpectedTradeError } from '@/lib/wallet/reportUnexpectedTradeError';

vi.mock('@/lib/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/wallet/reportUnexpectedTradeError', () => ({
  reportUnexpectedTradeError: vi.fn(),
}));

describe('classifyGasError', () => {
  beforeEach(() => {
    vi.mocked(logger.warn).mockClear();
    vi.mocked(reportUnexpectedTradeError).mockClear();
  });

  it('redacts policy ids, bearer tokens, and truncates long bodies', () => {
    const policyId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const longTail = 'x'.repeat(GAS_ERROR_LOG_MAX_LENGTH + 50);
    const raw = `Bearer secret-token policy_id=${policyId} "policyId":"${policyId}" ${longTail}`;
    const redacted = redactGasErrorLogBody(raw);
    expect(redacted).not.toContain('secret-token');
    expect(redacted).not.toContain(policyId);
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).toContain('…[truncated]');
    expect(redacted.length).toBeLessThanOrEqual(
      GAS_ERROR_LOG_MAX_LENGTH + '…[truncated]'.length,
    );
  });

  it('logs redacted body when a gas error is classified', () => {
    const policyId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const err = new Error(`Policy rejected policy_id=${policyId}`);
    classifyGasError(err);

    expect(logger.warn).toHaveBeenCalled();
    const warnPayload = vi.mocked(logger.warn).mock.calls[0][1] as {
      redactedErrorBody: string;
    };
    expect(warnPayload.redactedErrorBody).not.toContain(policyId);
    expect(reportUnexpectedTradeError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        redactedErrorBody: expect.not.stringContaining(policyId),
      }),
    );
  });

  it('lists provisional matchers with doc sources', () => {
    expect(PROVISIONAL_GAS_ERROR_MATCHERS.length).toBeGreaterThan(0);
    for (const row of PROVISIONAL_GAS_ERROR_MATCHERS) {
      expect(row.id).toMatch(/^[a-z0-9_]+$/);
      expect(row.source).toMatch(/^https:\/\/www\.alchemy\.com\//);
    }
  });

  it('treats bare Gas Manager policy strings as pre-submit fallback eligible', () => {
    const err = new Error('Policy rejected');
    expect(classifyGasError(err).kind).toBe('sponsor_policy_rejection');
    expect(classifyGasError(err).phase).toBe('pre_submit');
    expect(isSponsorFallbackEligible(err)).toBe(true);
  });

  it('classifies policy not found as sponsor rejection', () => {
    const err = new Error(
      'Sponsorship failed: [invalid_argument] Policy ID(s) not found.',
    );
    expect(classifyGasError(err).kind).toBe('sponsor_policy_rejection');
    expect(isSponsorFallbackEligible(err)).toBe(true);
  });

  it('classifies ERC20 gas balance errors as insufficient USDC', () => {
    const err = new Error('ERC20: transfer amount exceeds balance');
    expect(classifyGasError(err).kind).toBe('insufficient_usdc_for_gas');
    expect(isSponsorFallbackEligible(err)).toBe(false);
  });

  it('does not allow sponsor fallback for unclassified errors', () => {
    const err = new Error('unexpected upstream failure');
    expect(classifyGasError(err).kind).toBe('other');
    expect(isSponsorFallbackEligible(err)).toBe(false);
  });

  it('does not allow sponsor fallback when phase is not pre_submit', () => {
    const err = new Error('user operation reverted during sponsorship');
    expect(isSponsorFallbackEligible(err)).toBe(false);
  });

  it('does not allow sponsor fallback after a user op hash exists', () => {
    const err = new Error('Sponsorship failed: max number of userOps');
    expect(
      isSponsorFallbackEligible(err, { userOpHash: '0xabc' }),
    ).toBe(false);
  });
});
