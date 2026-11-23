import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getStreamByPlaybackId } from '@/services/streams';
import { requireWalletAuth, WalletAuthError } from '@/lib/auth/require-wallet';
import { checkMeTokenAccess } from '@/lib/utils/metoken-access';
import { signAccessJwt } from '@livepeer/core/crypto';
const { videoLookup } = vi.hoisted(() => ({ videoLookup: vi.fn() }));
vi.mock('@/services/streams', () => ({ getStreamByPlaybackId: vi.fn() }));
vi.mock('@/lib/auth/require-wallet', () => ({ requireWalletAuth: vi.fn(), WalletAuthError: class extends Error { constructor(public status: number, message: string) { super(message); } } }));
vi.mock('@/lib/utils/metoken-access', () => ({ checkMeTokenAccess: vi.fn(), isMeTokenGateActive: (required: boolean, price: number) => required || Number(price) > 0 }));
vi.mock('@/lib/utils/linked-identity', () => ({ resolveVerifiedViewerAddresses: vi.fn(async address => [address]) }));
vi.mock('@livepeer/core/crypto', () => ({ signAccessJwt: vi.fn(async () => 'legacy-token') }));
vi.mock('@/lib/sdk/supabase/service', () => ({ createServiceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: videoLookup }) }) }) }) }));
import { handleSignJwt } from './sign-jwt-handler';
const request = () => new NextRequest('https://example.test/api/internal/sign-jwt', { method: 'POST', body: JSON.stringify({ playbackId: 'pb-1' }) });
const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1', privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const stream = (required = false) => ({ creator_id: '0xcreator', requires_metoken: required, metoken_price: required ? 1 : 0 }) as unknown as NonNullable<Awaited<ReturnType<typeof getStreamByPlaybackId>>>;
describe('provider-aware viewer signing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VIDEO_PROVIDER', 'frameworks');
    vi.stubEnv('FRAMEWORKS_SIGNING_PRIVATE_KEY', pair.privateKey);
    vi.stubEnv('FRAMEWORKS_SIGNING_KID', 'test-key');
    vi.stubEnv('ACCESS_CONTROL_PRIVATE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_ACCESS_CONTROL_PUBLIC_KEY', '');
    vi.mocked(getStreamByPlaybackId).mockResolvedValue(stream());
    videoLookup.mockResolvedValue({ data: null, error: null });
    vi.mocked(requireWalletAuth).mockResolvedValue({ address: '0xviewer' });
    vi.mocked(checkMeTokenAccess).mockResolvedValue({ allowed: true });
  });
  afterEach(() => vi.unstubAllEnvs());
  it('mints a verified FrameWorks ES256 token scoped to the playback ID without Livepeer keys', async () => {
    const response = await handleSignJwt(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const { token } = await response.json();
    const claims = jwt.verify(token, pair.publicKey, { algorithms: ['ES256'], audience: 'pb-1' });
    expect(claims).toMatchObject({ sub: 'anonymous', aud: 'pb-1' });
    expect(() => jwt.verify(token, pair.publicKey, { audience: 'other-video' })).toThrow();
    expect(signAccessJwt).not.toHaveBeenCalled();
  });
  it('retains verified-wallet and token-balance authorization before minting a gated stream token', async () => {
    vi.mocked(getStreamByPlaybackId).mockResolvedValue(stream(true));
    vi.mocked(checkMeTokenAccess).mockResolvedValue({ allowed: false, reason: 'insufficient_balance' });
    const response = await handleSignJwt(request());
    expect(response.status).toBe(403);
    expect((await response.json()).token).toBeUndefined();
    expect(requireWalletAuth).toHaveBeenCalled();
  });
  it('denies a gated stream without wallet proof', async () => {
    vi.mocked(getStreamByPlaybackId).mockResolvedValue(stream(true));
    vi.mocked(requireWalletAuth).mockRejectedValue(new WalletAuthError(401, 'Missing wallet auth headers'));
    expect((await handleSignJwt(request())).status).toBe(403);
    expect(checkMeTokenAccess).not.toHaveBeenCalled();
  });
  it('does not sign unknown or draft FrameWorks VOD identifiers', async () => {
    vi.mocked(getStreamByPlaybackId).mockResolvedValue(null);
    expect((await handleSignJwt(request())).status).toBe(404);
    videoLookup.mockResolvedValue({ data: { ...stream(), status: 'draft' }, error: null });
    expect((await handleSignJwt(request())).status).toBe(404);
  });
  it('checks the published VOD gate before issuing a token', async () => {
    vi.mocked(getStreamByPlaybackId).mockResolvedValue(null);
    videoLookup.mockResolvedValue({ data: { ...stream(true), status: 'published' }, error: null });
    vi.mocked(checkMeTokenAccess).mockResolvedValue({ allowed: false });
    expect((await handleSignJwt(request())).status).toBe(403);
  });
  it('fails closed when VOD authorization storage is unavailable', async () => {
    vi.mocked(getStreamByPlaybackId).mockResolvedValue(null);
    videoLookup.mockResolvedValue({ data: null, error: { message: 'offline' } });
    expect((await handleSignJwt(request())).status).toBe(503);
  });
  it('keeps the selected Livepeer signing path', async () => {
    vi.stubEnv('VIDEO_PROVIDER', 'livepeer');
    vi.stubEnv('ACCESS_CONTROL_PRIVATE_KEY', 'legacy-private');
    vi.stubEnv('NEXT_PUBLIC_ACCESS_CONTROL_PUBLIC_KEY', 'legacy-public');
    const response = await handleSignJwt(request());
    expect(await response.json()).toEqual({ token: 'legacy-token' });
    expect(signAccessJwt).toHaveBeenCalled();
  });
});
