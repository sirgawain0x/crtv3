import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { encodePaymentSignatureHeader, decodePaymentResponseHeader } from '@x402/core/http';
import { CDP_FACILITATOR_URL, CREATIVE_TREASURY_ADDRESS, X402_NETWORK } from './x402-config';
const mocks = vi.hoisted(() => ({ supported: vi.fn(), verify: vi.fn(), settle: vi.fn(), reserve: vi.fn(), jwt: vi.fn(), configurations: [] as Array<Record<string, any>> }));
vi.mock('@coinbase/cdp-sdk/auth', () => ({ generateJwt: mocks.jwt }));
vi.mock('@x402/core/server', () => ({ HTTPFacilitatorClient: class {
  constructor(config: Record<string, any>) { mocks.configurations.push(config); }
  getSupported = mocks.supported;
  verify = mocks.verify;
  settle = mocks.settle;
} }));
vi.mock('@/lib/middleware/paymentReplayGuard', () => ({ consumePaymentReceipt: mocks.reserve }));
import { createX402Facilitator, settleX402Payment } from './x402-facilitator';
import { buildX402Requirements } from '@/lib/middleware/x402Gate';
const requirements = buildX402Requirements({ priceUsdc: '10000', recipient: CREATIVE_TREASURY_ADDRESS });
const transaction = '0x' + 'd'.repeat(64);
const payload = () => ({ x402Version: 2, accepted: requirements, payload: { signature: '0x1234', authorization: { from: '0x' + 'a'.repeat(40), nonce: '0x' + 'b'.repeat(64) } } });
const signature = () => encodePaymentSignatureHeader(payload());
beforeEach(() => {
  vi.clearAllMocks(); mocks.configurations.length = 0;
  vi.stubEnv('CDP_API_KEY_ID', 'test-key-id');
  vi.stubEnv('CDP_API_KEY_SECRET', 'test-key-secret');
  for (const key of ['CDP_API_KEY', 'CDP_API_SECRET', 'COINBASE_CDP_API_KEY_ID', 'COINBASE_CDP_API_KEY_SECRET']) vi.stubEnv(key, '');
  vi.stubEnv('X402_FACILITATOR_URL', CDP_FACILITATOR_URL);
  mocks.jwt.mockImplementation(async (options: { requestMethod: string; requestPath: string }) => `${options.requestMethod}:${options.requestPath}`);
  mocks.supported.mockResolvedValue({ kinds: [{ x402Version: 2, scheme: 'exact', network: X402_NETWORK }] });
  mocks.verify.mockResolvedValue({ isValid: true });
  mocks.reserve.mockResolvedValue({ ok: true });
  mocks.settle.mockResolvedValue({ success: true, transaction, network: X402_NETWORK });
});
afterEach(() => vi.unstubAllEnvs());
describe('Coinbase facilitator settlement boundary', () => {
  it.each([
    ['CDP_API_KEY', 'CDP_API_SECRET'],
    ['COINBASE_CDP_API_KEY_ID', 'COINBASE_CDP_API_KEY_SECRET'],
  ])('reuses the existing %s credential pair', async (idName, secretName) => {
    vi.stubEnv('CDP_API_KEY_ID', '');
    vi.stubEnv('CDP_API_KEY_SECRET', '');
    vi.stubEnv(idName, 'existing-id');
    vi.stubEnv(secretName, 'existing-secret');
    createX402Facilitator();
    await mocks.configurations[0].createAuthHeaders();
    expect(mocks.jwt).toHaveBeenCalledWith(expect.objectContaining({ apiKeyId: 'existing-id', apiKeySecret: 'existing-secret' }));
  });
  it('prefers the explicit x402 pair over the legacy pair', async () => {
    vi.stubEnv('CDP_API_KEY', 'legacy-id');
    vi.stubEnv('CDP_API_SECRET', 'legacy-secret');
    createX402Facilitator();
    await mocks.configurations[0].createAuthHeaders();
    expect(mocks.jwt).toHaveBeenCalledWith(expect.objectContaining({ apiKeyId: 'test-key-id', apiKeySecret: 'test-key-secret' }));
  });
  it('fails closed on a partial pair instead of mixing credentials', () => {
    vi.stubEnv('CDP_API_KEY_SECRET', '');
    vi.stubEnv('CDP_API_KEY', 'legacy-id');
    vi.stubEnv('CDP_API_SECRET', 'legacy-secret');
    expect(() => createX402Facilitator()).toThrow('Coinbase CDP server credentials are not configured');
    expect(mocks.configurations).toHaveLength(0);
  });
  it('uses Coinbase with operation-scoped server authentication', async () => {
    createX402Facilitator();
    const config = mocks.configurations[0];
    expect(config.url).toBe(CDP_FACILITATOR_URL);
    expect(await config.createAuthHeaders()).toEqual({
      supported: { Authorization: 'Bearer GET:/platform/v2/x402/supported' },
      verify: { Authorization: 'Bearer POST:/platform/v2/x402/verify' },
      settle: { Authorization: 'Bearer POST:/platform/v2/x402/settle' },
    });
    expect(mocks.jwt).toHaveBeenCalledWith(expect.objectContaining({ apiKeyId: 'test-key-id', apiKeySecret: 'test-key-secret', requestHost: 'api.cdp.coinbase.com', expiresIn: 120 }));
  });
  it('verifies, reserves and settles before granting access with a receipt', async () => {
    const result = await settleX402Payment(signature(), requirements);
    expect(result.ok).toBe(true);
    expect(mocks.verify).toHaveBeenCalledWith(payload(), requirements);
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.verify.mock.invocationCallOrder[0]);
    expect(mocks.settle.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.reserve.mock.invocationCallOrder[0]);
    if (result.ok) expect(decodePaymentResponseHeader(result.paymentResponse).transaction).toBe(transaction);
  });
  it('fails closed when only Sepolia is supported', async () => {
    mocks.supported.mockResolvedValue({ kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:84532' }] });
    expect(await settleX402Payment(signature(), requirements)).toMatchObject({ ok: false, unavailable: true });
    expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.settle).not.toHaveBeenCalled();
  });
  it('never settles an invalid or replayed authorization', async () => {
    mocks.verify.mockResolvedValueOnce({ isValid: false });
    expect((await settleX402Payment(signature(), requirements)).ok).toBe(false);
    expect(mocks.reserve).not.toHaveBeenCalled();
    mocks.reserve.mockResolvedValue({ ok: false, error: 'Payment proof already used' });
    expect((await settleX402Payment(signature(), requirements)).ok).toBe(false);
    expect(mocks.settle).not.toHaveBeenCalled();
  });
  it.each(['amount', 'asset', 'payTo', 'network', 'scheme'] as const)('rejects mismatched %s before calling the facilitator', async (field) => {
    const altered = payload(); altered.accepted = { ...requirements, [field]: 'wrong' };
    expect((await settleX402Payment(encodePaymentSignatureHeader(altered), requirements)).ok).toBe(false);
    expect(mocks.supported).not.toHaveBeenCalled();
  });
  it('does not retry settlement when the result is indeterminate', async () => {
    mocks.settle.mockRejectedValue(new Error('timeout with provider credentials'));
    const result = await settleX402Payment(signature(), requirements);
    expect(result).toMatchObject({ ok: false, unavailable: true });
    expect(JSON.stringify(result)).not.toContain('credentials');
    expect(mocks.reserve).toHaveBeenCalledOnce(); expect(mocks.settle).toHaveBeenCalledOnce();
  });
  it('does not allow an unconfirmed or wrong-network settlement', async () => {
    mocks.settle.mockResolvedValue({ success: true, transaction, network: 'eip155:84532' });
    expect((await settleX402Payment(signature(), requirements)).ok).toBe(false);
  });
  it('rejects malformed and oversized signatures locally', async () => {
    expect((await settleX402Payment('invalid', requirements)).ok).toBe(false);
    expect((await settleX402Payment('a'.repeat(16385), requirements)).ok).toBe(false);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('fails closed without Coinbase credentials', async () => {
    vi.stubEnv('CDP_API_KEY_SECRET', '');
    expect(await settleX402Payment(signature(), requirements)).toMatchObject({ ok: false, unavailable: true });
    expect(mocks.supported).not.toHaveBeenCalled();
  });
  it('does not fall back to another facilitator or send credentials to it', async () => {
    vi.stubEnv('X402_FACILITATOR_URL', 'https://another-facilitator.example');
    expect(await settleX402Payment(signature(), requirements)).toMatchObject({ ok: false, unavailable: true });
    expect(mocks.supported).not.toHaveBeenCalled();
  });
});
