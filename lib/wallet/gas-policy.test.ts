import { afterEach, describe, expect, it, vi } from 'vitest';
import { limitGasCapabilities } from './gas-policy';
import { buildMeTokenCreationGasContext } from '@/lib/metokens/metoken-gas';
import { buildSponsoredAttestationGasContext } from '@/lib/eas/attestation-gas';

const policyId = '12345678-1234-1234-1234-123456789abc';

afterEach(() => vi.unstubAllEnvs());

describe('gas cost circuit breakers', () => {
  it('removes legacy and new sponsorship capabilities by default while preserving permissions', () => {
    vi.stubEnv('NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED', 'false');
    const capabilities = { paymaster: { policyId }, paymasterService: { policyId }, permissions: { context: '0x01' } };
    expect(limitGasCapabilities(capabilities)).toEqual({ permissions: { context: '0x01' } });
    expect(capabilities.paymaster).toEqual({ policyId });
  });
  it('requires a separate opt-in for token-paid gas', () => {
    vi.stubEnv('NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED', 'false');
    const capabilities = { paymaster: { policyId, erc20: { tokenAddress: '0x123' } } };
    expect(limitGasCapabilities(capabilities)).toBeUndefined();
    vi.stubEnv('NEXT_PUBLIC_USDC_GAS_PAYMENTS_ENABLED', 'true');
    expect(limitGasCapabilities(capabilities)).toEqual(capabilities);
  });
  it('allows sponsorship only after explicit opt-in', () => {
    vi.stubEnv('NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED', 'true');
    expect(limitGasCapabilities({ paymaster: { policyId } })).toEqual({ paymaster: { policyId } });
  });
  it('pauses MeToken and attestation sponsorship even when policy IDs are configured', () => {
    vi.stubEnv('NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED', 'false');
    vi.stubEnv('NEXT_PUBLIC_ALCHEMY_PAYMASTER_POLICY_ID', policyId);
    vi.stubEnv('NEXT_PUBLIC_ATTESTATION_SPONSORED_POLICY_ID', policyId);
    expect(buildMeTokenCreationGasContext()).toEqual({ context: undefined, isSponsored: false });
    expect(buildSponsoredAttestationGasContext(policyId)).toEqual({ context: undefined, isSponsored: false });
  });
});
