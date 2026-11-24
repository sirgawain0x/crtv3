import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getVideoProvider } from '@/lib/video-provider';
import { handlePlaybackInfo } from './playback-info-handler';
import { handleSignJwt } from './sign-jwt-handler';
import { NextResponse } from 'next/server';
vi.mock('./sign-jwt-handler', () => ({ handleSignJwt: vi.fn() }));
vi.mock('@/lib/video-provider/frameworks/playback-alias', () => ({ resolveFrameworksPlaybackAlias: vi.fn(async id => id) }));
import { resolveFrameworksPlaybackAlias } from '@/lib/video-provider/frameworks/playback-alias';
vi.mock('@/lib/video-provider', () => ({ getVideoProvider: vi.fn() }));
vi.mock('@/lib/video-provider/frameworks/resolve-playback',()=>({resolveAuthorizedFrameworksHlsUrl:vi.fn(async()=> 'https://edge.frameworks.network/hls/video/index.m3u8?fwjwt=viewer-token')}));
import {resolveAuthorizedFrameworksHlsUrl} from '@/lib/video-provider/frameworks/resolve-playback';
const playback = vi.fn();
const configured = vi.fn();
describe('provider playback HTTP boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveFrameworksPlaybackAlias).mockImplementation(async id => id);
    configured.mockReturnValue(true);
    vi.mocked(handleSignJwt).mockResolvedValue(NextResponse.json({token:'viewer-token'}));
    vi.mocked(getVideoProvider).mockReturnValue({ id: 'frameworks', isConfigured: configured, playback: { get: playback } } as unknown as ReturnType<typeof getVideoProvider>);
  });
  it.each(['livepeer', 'frameworks'] as const)('uses the selected %s provider', async id => {
    vi.mocked(getVideoProvider).mockReturnValue({ id, isConfigured: configured, playback: { get: playback } } as unknown as ReturnType<typeof getVideoProvider>);
    playback.mockResolvedValue({ playbackInfo: { meta: { source: [{ url: 'https://media.example/hls.m3u8', type: 'application/x-mpegURL' }] } } });
    const response = await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=pb-1'));
    expect(response.status).toBe(200);
    expect(playback).toHaveBeenCalledWith('pb-1');
    expect((await response.json()).meta.source[0].url).toBe(id === 'frameworks'
      ? 'https://edge.frameworks.network/hls/video/index.m3u8?fwjwt=viewer-token' : 'https://media.example/hls.m3u8');
    if(id==='frameworks')expect(resolveAuthorizedFrameworksHlsUrl).toHaveBeenCalledWith('pb-1','viewer-token');
    if (id === 'frameworks') expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('resolves old embeds to the canonical playback URL', async () => {
    vi.mocked(resolveFrameworksPlaybackAlias).mockResolvedValue('new-playback');
    playback.mockResolvedValue({playbackInfo:{meta:{source:[]}}});
    expect((await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=old-playback'))).status).toBe(200);
    expect(playback).toHaveBeenCalledWith('new-playback');
  });
  it('does not call an unconfigured provider', async () => {
    configured.mockReturnValue(false);
    expect((await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=pb-1'))).status).toBe(503);
    expect(playback).not.toHaveBeenCalled();
    expect(resolveAuthorizedFrameworksHlsUrl).not.toHaveBeenCalled();
  });
  it('rejects wallet addresses as playback identifiers before provider calls', async () => {
    expect((await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=0x' + '1'.repeat(40)))).status).toBe(400);
    expect(playback).not.toHaveBeenCalled();
  });
  it.each([403,404,503])('preserves authorization denial %s without fetching media', async status => {
    vi.mocked(handleSignJwt).mockResolvedValue(NextResponse.json({code:'ACCESS_DENIED'},{status}));
    const response = await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=pb-1'));
    expect(response.status).toBe(status);
    expect(playback).not.toHaveBeenCalled();
  });
  it('forwards wallet proof and canonical identity to the existing authorization checks', async () => {
    vi.mocked(resolveFrameworksPlaybackAlias).mockResolvedValue('canonical');
    playback.mockResolvedValue({playbackInfo:{meta:{source:[]}}});
    await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=old',{
      headers:{'x-wallet-address':'0xviewer','x-wallet-signature':'proof','x-wallet-timestamp':'123'},
    }));
    const authorizationRequest = vi.mocked(handleSignJwt).mock.calls[0][0];
    expect(authorizationRequest.headers.get('x-wallet-signature')).toBe('proof');
    expect(await authorizationRequest.json()).toMatchObject({playbackId:'canonical'});
  });
});
