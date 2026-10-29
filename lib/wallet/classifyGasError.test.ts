import { describe, expect, it } from 'vitest';
import {
  classifyGasError,
  isSponsorFallbackEligible,
  PROVISIONAL_GAS_ERROR_MATCHERS,
  redactGasErrorLogBody,
  GAS_ERROR_LOG_MAX_LENGTH,
} from './classifyGasError';

const ALCHEMY_KEY = 'super-secret-alchemy-key-12345';

describe('classifyGasError', () => {
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

  it('redacts Alchemy /v2/ keys embedded in error message URLs', () => {
    const raw = `RPC error at https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY} failed`;
    const redacted = redactGasErrorLogBody(raw);
    expect(redacted).not.toContain(ALCHEMY_KEY);
    expect(redacted).toContain('/v2/[REDACTED]');
  });

  it('redacts rpcUrl field values', () => {
    const raw = `{"rpcUrl":"https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}"}`;
    const redacted = redactGasErrorLogBody(raw);
    expect(redacted).not.toContain(ALCHEMY_KEY);
    expect(redacted).toContain('"rpcUrl":"[REDACTED]"');
  });

  it('redacts URL: line values', () => {
    const raw = `HTTP request failed URL: https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
    const redacted = redactGasErrorLogBody(raw);
    expect(redacted).not.toContain(ALCHEMY_KEY);
    expect(redacted).toMatch(/URL:\s*\[REDACTED\]/);
  });

  it('redacts paymasterAndData by key name', () => {
    const raw = '"paymasterAndData":"0xdeadbeef"';
    expect(redactGasErrorLogBody(raw)).toBe('"paymasterAndData":"[REDACTED]"');
  });

  it('redacts paymaster by key name', () => {
    const raw = 'paymaster=0xabc123';
    expect(redactGasErrorLogBody(raw)).toBe('paymaster=[REDACTED]');
  });

  it('redacts signature by key name', () => {
    const raw = '"signature":"0xshortsig"';
    expect(redactGasErrorLogBody(raw)).toBe('"signature":"[REDACTED]"');
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
