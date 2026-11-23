import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getVideoProvider } from '@/lib/video-provider';
import { handlePlaybackInfo } from './playback-info-handler';
vi.mock('@/lib/video-provider', () => ({ getVideoProvider: vi.fn() }));
const playback = vi.fn();
const configured = vi.fn();
describe('provider playback HTTP boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configured.mockReturnValue(true);
    vi.mocked(getVideoProvider).mockReturnValue({ id: 'frameworks', isConfigured: configured, playback: { get: playback } } as unknown as ReturnType<typeof getVideoProvider>);
  });
  it.each(['livepeer', 'frameworks'] as const)('uses the selected %s provider', async id => {
    vi.mocked(getVideoProvider).mockReturnValue({ id, isConfigured: configured, playback: { get: playback } } as unknown as ReturnType<typeof getVideoProvider>);
    playback.mockResolvedValue({ playbackInfo: { meta: { source: [{ url: 'https://media.example/hls.m3u8', type: 'application/x-mpegURL' }] } } });
    const response = await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=pb-1'));
    expect(response.status).toBe(200);
    expect(playback).toHaveBeenCalledWith('pb-1');
    expect((await response.json()).meta.source[0].url).toBe('https://media.example/hls.m3u8');
  });
  it('does not call an unconfigured provider', async () => {
    configured.mockReturnValue(false);
    expect((await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=pb-1'))).status).toBe(503);
    expect(playback).not.toHaveBeenCalled();
  });
  it('rejects wallet addresses as playback identifiers before provider calls', async () => {
    expect((await handlePlaybackInfo(new NextRequest('https://example.test/api/internal/playback-info?playbackId=0x' + '1'.repeat(40)))).status).toBe(400);
    expect(playback).not.toHaveBeenCalled();
  });
});
