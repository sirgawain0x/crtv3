'use client';
import * as Player from '@livepeer/react/player';
import { Src } from '@livepeer/react';
import {
  PlayIcon,
  PauseIcon,
  MuteIcon,
  UnmuteIcon,
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  PictureInPictureIcon,
} from '@livepeer/react/assets';
import {
  SubtitlesControl,
  SubtitlesDisplay,
  SubtitlesProvider,
  useSubtitles,
} from './Subtitles';
import { useEffect, useState, useRef } from 'react';
import { useVideo } from '@app/context/VideoContext';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import './Player.css';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { forwardRef } from 'react';

const RateSelectItem = forwardRef<HTMLDivElement, Player.RateSelectItemProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <Player.RateSelectItem
        className="relative flex h-[30px] cursor-pointer select-none items-center rounded pl-6 pr-9 text-xs text-white hover:bg-white/10"
        {...props}
        ref={forwardedRef}
      >
        <Player.SelectItemText>{children}</Player.SelectItemText>
        <Player.SelectItemIndicator className="absolute left-0 flex w-6 items-center justify-center">
          <CheckIcon className="h-3.5 w-3.5 text-white" />
        </Player.SelectItemIndicator>
      </Player.RateSelectItem>
    );
  },
);

RateSelectItem.displayName = 'RateSelectItem';

export const PreviewPlayer: React.FC<{
  src: Src[] | null;
  title: string;
  assetMetadata?: AssetMetadata;
}> = ({ src, title, assetMetadata }) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentPlayingId, setCurrentPlayingId } = useVideo();
  const playerId = useRef(Math.random().toString(36).substring(7)).current;

  useEffect(() => {
    resetFadeTimeout();
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [src, title]);

  useEffect(() => {
    if (currentPlayingId && currentPlayingId !== playerId) {
      // Another video started playing, pause this one
      const video = containerRef.current?.querySelector('video');
      if (video && !video.paused) {
        video.pause();
      }
    }
  }, [currentPlayingId, playerId]);

  if (!src || src.length === 0) {
    return <div>No video source available.</div>;
  }

  const resetFadeTimeout = () => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    setControlsVisible(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2000);
  };

  const handleControlInteraction = () => {
    setControlsVisible(true);
    resetFadeTimeout();
  };

  const handlePlay = () => {
    setCurrentPlayingId(playerId);
  };

  return (
    <SubtitlesProvider>
      <Player.Root src={src} volume={1}>
        <Player.Container
          ref={containerRef}
          className="player-container relative aspect-video touch-none"
          onMouseMove={resetFadeTimeout}
          onMouseEnter={() => setControlsVisible(true)}
          onTouchStart={handleControlInteraction}
        >
          <Player.Video
            title={title}
            className="h-full w-full"
            playsInline
            controls={false}
          />

          <Player.LoadingIndicator
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'black',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 20,
            }}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <div className="text-lg font-semibold text-white">Loading...</div>
            </div>
          </Player.LoadingIndicator>

          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 transition-opacity duration-300 ${
              controlsVisible ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <div
            className={`absolute inset-0 z-30 touch-none transition-opacity duration-300 ${
              controlsVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-6">
                <Player.PlayPauseTrigger
                  className="group relative flex h-16 w-16 cursor-pointer touch-none items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
                  onClick={handleControlInteraction}
                >
                  <Player.PlayingIndicator asChild matcher={false}>
                    <PlayIcon className="h-10 w-10 text-white" />
                  </Player.PlayingIndicator>
                  <Player.PlayingIndicator asChild>
                    <PauseIcon className="h-10 w-10 text-white" />
                  </Player.PlayingIndicator>
                </Player.PlayPauseTrigger>

                <Player.MuteTrigger
                  className="group relative flex h-14 w-14 cursor-pointer touch-none items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
                  onClick={handleControlInteraction}
                >
                  <Player.VolumeIndicator asChild matcher={false}>
                    <MuteIcon className="h-8 w-8 text-white" />
                  </Player.VolumeIndicator>
                  <Player.VolumeIndicator asChild matcher={true}>
                    <UnmuteIcon className="h-8 w-8 text-white" />
                  </Player.VolumeIndicator>
                </Player.MuteTrigger>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-30 touch-none transition-opacity duration-300">
            <div
              className={`flex items-center justify-between px-5 pb-8 ${
                controlsVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Player.Time className="rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium tabular-nums text-white/90" />

              <div className="flex items-center gap-4">
                {assetMetadata?.subtitles && <SubtitlesControl />}
                <Player.RateSelect name="rateSelect">
                  <Player.SelectTrigger
                    className="flex h-[30px] min-w-[90px] items-center justify-between gap-1.5 rounded border border-white/20 px-2.5 text-xs text-white transition-colors hover:bg-white/10"
                    aria-label="Playback speed"
                  >
                    <Player.SelectValue placeholder="1x" />
                    <Player.SelectIcon>
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </Player.SelectIcon>
                  </Player.SelectTrigger>
                  <Player.SelectPortal>
                    <Player.SelectContent className="rounded border border-white/20 bg-black/90 backdrop-blur-sm ">
                      <Player.SelectViewport className="p-1">
                        <Player.SelectGroup>
                          <RateSelectItem value={0.25}>0.25x</RateSelectItem>
                          <RateSelectItem value={0.5}>0.5x</RateSelectItem>
                          <RateSelectItem value={0.75}>0.75x</RateSelectItem>
                          <RateSelectItem value={1}>1x</RateSelectItem>
                          <RateSelectItem value={1.25}>1.25x</RateSelectItem>
                          <RateSelectItem value={1.5}>1.5x</RateSelectItem>
                          <RateSelectItem value={1.75}>1.75x</RateSelectItem>
                          <RateSelectItem value={2}>2x</RateSelectItem>
                        </Player.SelectGroup>
                      </Player.SelectViewport>
                    </Player.SelectContent>
                  </Player.SelectPortal>
                </Player.RateSelect>
                <Player.FullscreenTrigger className="group relative flex h-10 w-10 cursor-pointer touch-none items-center justify-center rounded-full bg-black/50 hover:bg-black/70">
                  <Player.FullscreenIndicator asChild matcher={false}>
                    <EnterFullscreenIcon className="h-6 w-6 text-white" />
                  </Player.FullscreenIndicator>
                  <Player.FullscreenIndicator asChild>
                    <ExitFullscreenIcon className="h-6 w-6 text-white" />
                  </Player.FullscreenIndicator>
                </Player.FullscreenTrigger>
                <Player.PictureInPictureTrigger className="group relative flex h-10 w-10 cursor-pointer touch-none items-center justify-center rounded-full bg-black/50 hover:bg-black/70">
                  <PictureInPictureIcon className="h-6 w-6 text-white" />
                </Player.PictureInPictureTrigger>
              </div>
            </div>

            <Player.Seek
              className={`absolute bottom-5 left-5 right-5 flex h-5 touch-none select-none items-center gap-2.5 transition-opacity duration-300 ${
                controlsVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Player.Track className="relative h-0.5 flex-grow rounded-full bg-white/70">
                <Player.SeekBuffer className="absolute h-full rounded-full bg-black/50" />
                <Player.Range className="absolute h-full rounded-full bg-white" />
              </Player.Track>
              <Player.Thumb className="block h-3 w-3 rounded-full bg-white" />
            </Player.Seek>
          </div>
        </Player.Container>
      </Player.Root>
    </SubtitlesProvider>
  );
};
