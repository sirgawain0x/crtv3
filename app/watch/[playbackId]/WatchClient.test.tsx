/** @vitest-environment jsdom */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  playbackId: 'parent', address: '0x' + 'b'.repeat(40), revision: 0,
  sources: vi.fn(), stream: vi.fn(), fetch: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useParams: () => ({ playbackId: m.playbackId }) }));
vi.mock('@/lib/wallet/react', () => ({ useUser: () => ({ address: m.address }) }));
vi.mock('@/lib/hooks/accountkit/useModularAccount', () => ({ default: () => ({ address: m.address }) }));
vi.mock('@/lib/auth/useWalletAuth', () => ({ useWalletAuth: () => {
  // Like the real cache subscription, a fresh proof replaces these callbacks.
  const revision = m.revision;
  const address = m.address;
  const getCachedAuthHeaders = React.useCallback(() => ({ revision }), [revision, address]);
  const getAuthHeaders = React.useCallback(async () => ({ 'X-Wallet-Address': address }), [address]);
  return { address, getCachedAuthHeaders, getAuthHeaders };
} }));
vi.mock('@/lib/hooks/useInterval', () => ({ useInterval: () => {} }));
vi.mock('@/lib/hooks/livepeer/useLivepeerRealtimeMetrics', () => ({ useLivepeerRealtimeMetrics: () => ({ viewerCount: 1 }) }));
vi.mock('@/lib/hooks/livepeer/useDetailPlaybackSources', () => ({ getDetailPlaybackSource: m.sources }));
vi.mock('@/services/streams', () => ({ getStreamByPlaybackId: m.stream }));
vi.mock('@/components/Player/Player', () => ({ Player: () => <div>Playing</div> }));
vi.mock('@/components/Player/PreviewPlayer', () => ({ PreviewPlayer: () => null }));
vi.mock('@/components/Live/LiveTokenPanel', () => ({ LiveTokenPanel: () => null }));
vi.mock('@/components/Live/LensLiveChat', () => ({ LensLiveChat: () => null }));
vi.mock('@/components/Live/DigitalTwinOverlay', () => ({ DigitalTwinOverlay: () => null }));
vi.mock('@/components/Live/LiveStreamMeTokenGate', () => ({ LiveStreamMeTokenGate: () => <div>Gated</div> }));
vi.mock('@/components/Player/RealtimeViewsComponent', () => ({ RealtimeViewsComponent: () => null }));
vi.mock('@/components/Player/ViewsComponent', () => ({ ViewsComponent: () => null }));
vi.mock('@/components/Market/MeTokenShareButton', () => ({ MeTokenShareButton: () => null }));
vi.mock('@/components/songchain/SongchainShareClipDialog', () => ({ SongchainShareClipDialog: () => null }));
vi.mock('@/services/video-assets', () => ({ updateVideoAsset: vi.fn() }));
vi.mock('@/lib/auth/require-wallet', () => ({ walletAuthHeadersToArgs: () => ({ address: m.address }) }));
vi.mock('@/lib/utils/metoken-access', () => ({ isMeTokenGateActive: (required: boolean) => required }));
import WatchClient from './WatchClient';

let root: Root, container: HTMLDivElement;
const response = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
beforeEach(() => {
  vi.clearAllMocks(); m.revision = 0; m.playbackId = 'parent'; m.address = '0x' + 'b'.repeat(40);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  m.sources.mockResolvedValue([{ type: 'hls', src: 'https://example.test/live.m3u8' }]);
  m.stream.mockResolvedValue({ creator_id: m.address, requires_metoken: false, allow_clipping: true });
  m.fetch.mockImplementation(async (url: string) => response(url.includes('sign-jwt') ? { token: 'test-token' } : {}));
  vi.stubGlobal('fetch', m.fetch);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

it('keeps an in-flight clip mounted when its wallet proof refreshes', async () => {
  let finishClip!: (value: unknown) => void;
  m.fetch.mockImplementation(async (url: string) => {
    if (url === '/api/livepeer/clips') return new Promise(resolve => { finishClip = resolve; });
    if (url === '/api/video-assets/clips') return response({ clip: { id: 7, title: 'Saved clip' } });
    return response(url.includes('sign-jwt') ? { token: 'test-token' } : {});
  });
  await act(async () => root.render(<WatchClient />));
  const quickClip = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Last 15s');
  expect(quickClip).toBeTruthy();
  await act(async () => quickClip!.click());
  m.revision++;
  await act(async () => root.render(<WatchClient />));
  expect(m.sources).toHaveBeenCalledTimes(1);
  await act(async () => finishClip(response({ assetId: 'clip', newPlaybackId: 'clip-play', playbackUrl: 'https://example.test/clip.m3u8', parentPlaybackId: 'parent' })));
  expect(container.textContent).toContain('Publish clip');
  expect(m.fetch.mock.calls.some(([url]) => url === '/api/video-assets/clips')).toBe(true);
});

it('reauthorizes playback when the connected wallet or stream changes', async () => {
  await act(async () => root.render(<WatchClient />));
  m.address = '0x' + 'c'.repeat(40);
  await act(async () => root.render(<WatchClient />));
  expect(m.sources).toHaveBeenCalledTimes(2);
  m.playbackId = 'another-stream';
  await act(async () => root.render(<WatchClient />));
  expect(m.sources).toHaveBeenCalledTimes(3);
  expect(m.sources.mock.calls.at(-1)?.[0]).toBe('another-stream');
});

it('keeps clipping unavailable when stream authorization is denied', async () => {
  m.stream.mockResolvedValue({ creator_id: m.address, requires_metoken: true });
  m.fetch.mockImplementation(async (url: string) => url.includes('sign-jwt')
    ? { ok: false, status: 403, json: async () => ({ code: 'METOKEN_REQUIRED', creatorAddress: m.address }) }
    : response({}));
  await act(async () => root.render(<WatchClient />));
  m.revision++;
  await act(async () => root.render(<WatchClient />));
  expect(container.textContent).toContain('Gated');
  expect(container.textContent).not.toContain('Create a clip');
  expect(container.textContent).not.toContain('Playing');
});
