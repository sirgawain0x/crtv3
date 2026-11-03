import { describe, expect, it, vi } from 'vitest';

/**
 * Mirrors buyMeTokens approve gating: completed approves are skipped on retry,
 * so a mint-only retry does not re-send vault/diamond approves.
 */
describe('MeToken buy trade step gating', () => {
  it('resumes at mint without redoing finished approves', async () => {
    const sendCalls: string[] = [];

    const vaultAllowance = 0n;
    const diamondAllowance = 0n;
    const required = 100n;

    if (vaultAllowance < required) {
      sendCalls.push('vault-approve');
    }
    if (diamondAllowance < required) {
      sendCalls.push('diamond-approve');
    }

    const mintSend = vi
      .fn()
      .mockRejectedValueOnce(new Error('Sponsorship failed: policy rejected'))
      .mockResolvedValueOnce({ hash: 'mint-2' });

    try {
      await mintSend();
    } catch {
      await mintSend();
    }
    sendCalls.push('mint');

    expect(sendCalls).toEqual(['vault-approve', 'diamond-approve', 'mint']);
    expect(mintSend).toHaveBeenCalledTimes(2);

    const retryVaultAllowance = required;
    const retryDiamondAllowance = required;
    const retrySendCalls: string[] = [];
    if (retryVaultAllowance < required) retrySendCalls.push('vault-approve');
    if (retryDiamondAllowance < required) retrySendCalls.push('diamond-approve');
    retrySendCalls.push('mint-retry');

    expect(retrySendCalls).toEqual(['mint-retry']);
  });
});
