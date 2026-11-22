import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CREATIVE_TREASURY_ADDRESS } from '@/lib/payments/x402-config';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), consume: vi.fn() }));
vi.mock('@/lib/payments/verify-usdc-payment', () => ({ verifyUsdcPaymentProof: mocks.verify }));
vi.mock('@/lib/middleware/paymentReplayGuard', () => ({ consumePaymentReceipt: mocks.consume }));
import { verifyCreativeGuidePaymentProof } from './verify-payment';
beforeEach(() => { vi.clearAllMocks(); mocks.verify.mockResolvedValue({ valid: true }); mocks.consume.mockResolvedValue({ ok: true }); });
describe('Creative Guide payment redemption', () => {
  it('verifies the approved Safe recipient and consumes the payment once', async () => {
    expect(await verifyCreativeGuidePaymentProof('0xhash', '5000')).toEqual({ valid: true });
    expect(mocks.verify).toHaveBeenCalledWith(expect.objectContaining({ recipient: CREATIVE_TREASURY_ADDRESS }));
    expect(mocks.consume).toHaveBeenCalledWith('0xhash', 'creative-guide-redemption');
  });
  it('does not consume an invalid payment', async () => {
    mocks.verify.mockResolvedValue({ valid: false, error: 'Invalid transfer' });
    expect((await verifyCreativeGuidePaymentProof('0xhash', '5000')).valid).toBe(false);
    expect(mocks.consume).not.toHaveBeenCalled();
  });
  it('rejects replayed feature payments', async () => {
    mocks.consume.mockResolvedValue({ ok: false, error: 'Payment proof already used' });
    expect(await verifyCreativeGuidePaymentProof('0xhash', '5000')).toEqual({ valid: false, error: 'Payment proof already used' });
  });
});
