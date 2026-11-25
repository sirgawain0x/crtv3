/** @vitest-environment jsdom */
import React, { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { VideoProvider } from '@/context/VideoContext';

vi.mock('./ViewsComponent', () => ({ ViewsComponent: () => null }));
vi.mock('./CreativeBrandOverlay', () => ({ CreativeBrandOverlay: () => null }));
vi.mock('@livepeer/react/assets', () => ({ PlayIcon: () => null, PauseIcon: () => null, MuteIcon: () => null, UnmuteIcon: () => null, EnterFullscreenIcon: () => null, ExitFullscreenIcon: () => null }));
vi.mock('@livepeer/react/player', () => {
  const Box = ({ children }: any) => <div>{children}</div>;
  return {
    Root: ({ children }: any) => <div data-player-root>{children}</div>, Container: Box,
    Video: ({ title, onPlay, onPause }: any) => <video title={title} onPlay={onPlay} onPause={onPause} />,
    // The real vendor trigger already toggles playback. The consumer must not toggle it again.
    PlayPauseTrigger: ({ onClick }: any) => <button onClick={event => {
      onClick?.(event);
      const video = event.currentTarget.closest('[data-player-root]')!.querySelector('video')!;
      if (video.paused) void video.play(); else video.pause();
    }}>Play or pause</button>,
    MuteTrigger: ({ onClick }: any) => <button onClick={onClick}>Mute</button>,
    LoadingIndicator: () => null, PlayingIndicator: () => null, VolumeIndicator: () => null,
    FullscreenIndicator: () => null, FullscreenTrigger: () => null, Time: () => null,
    Seek: Box, Track: Box, SeekBuffer: () => null, Range: () => null, Thumb: () => null,
  };
});
import { PreviewPlayer } from './PreviewPlayer';

let root: Root, container: HTMLDivElement;
let paused: WeakMap<HTMLMediaElement, boolean>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  paused = new WeakMap();
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(function () { return paused.get(this) ?? true; });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () {
    paused.set(this, false); this.dispatchEvent(new Event('play')); return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function () {
    if (this.paused) return;
    paused.set(this, true); this.dispatchEvent(new Event('pause'));
  });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const sources = [{ type: 'hls', src: 'https://example.test/clip.m3u8' }] as any;
async function renderPlayers() {
  await act(async () => root.render(<StrictMode><VideoProvider>
    <PreviewPlayer src={sources} title="First clip" playbackId="first" />
    <PreviewPlayer src={sources} title="Second clip" playbackId="second" />
  </VideoProvider></StrictMode>));
}
function buttons(label: string) { return Array.from(container.querySelectorAll('button')).filter(b => b.textContent === label); }

it('keeps the preview playing when it becomes the active player and lets the trigger pause it once', async () => {
  await renderPlayers(); const video = container.querySelector('video')!;
  await act(async () => buttons('Play or pause')[0].click());
  expect(video.paused).toBe(false);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
  await act(async () => buttons('Play or pause')[0].click());
  expect(video.paused).toBe(true);
});

it('pauses the previous preview when a different preview starts', async () => {
  await renderPlayers(); const videos = container.querySelectorAll('video');
  await act(async () => buttons('Play or pause')[0].click());
  await act(async () => buttons('Play or pause')[1].click());
  expect(videos[0].paused).toBe(true);
  expect(videos[1].paused).toBe(false);
});

it('does not start or stop playback when mute is clicked', async () => {
  await renderPlayers(); const video = container.querySelector('video')!;
  await act(async () => buttons('Mute')[0].click()); expect(video.paused).toBe(true);
  await act(async () => buttons('Play or pause')[0].click());
  await act(async () => buttons('Mute')[0].click()); expect(video.paused).toBe(false);
});
