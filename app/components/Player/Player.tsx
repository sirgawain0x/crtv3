'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  PauseIcon,
  PlayIcon,
  LoadingIcon,
  MuteIcon,
  UnmuteIcon,
} from '@livepeer/react/assets';
import { Src } from '@livepeer/react';
import * as Player from '@livepeer/react/player';
import {
  SubtitlesControl,
  SubtitlesDisplay,
  SubtitlesProvider,
  useSubtitles,
} from './Subtitles';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { toast } from 'sonner';
import { fetchAssetId } from '@app/api/livepeer/actions';
import { generateAccessKey } from '@app/lib/access-key';
import { WebhookContext } from '@app/api/livepeer/token-gate/route';
import { useUser } from '@account-kit/react';
import { GetAssetResponse } from 'livepeer/models/operations';
import { useVideo } from '@app/context/VideoContext';

interface PlayerComponentProps {
  src: Src[] | null;
  assetId: string;
  title: string;
  accessKey?: string;
  onPlay?: () => void;
}

export const PlayerComponent: React.FC<PlayerComponentProps> = ({
  src,
  assetId,
  title,
  accessKey,
  onPlay,
}) => {
  const [assetMetadata, setAssetMetadata] = useState<AssetMetadata | null>(
    null,
  );
  const [controlsVisible, setControlsVisible] = useState(true);
  const [conditionalProps, setConditionalProps] = useState<any>({});
  const fadeTimeoutRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentPlayingId, setCurrentPlayingId } = useVideo();
  const playerId = useRef(Math.random().toString(36).substring(7)).current;

  const user = useUser();

  const { getAssetMetadata } = useOrbisContext();
  const { setSubtitles } = useSubtitles();

  useEffect(() => {
    const handleVideoMetadata = () => {
      const video = videoRef.current;
      const container = containerRef.current;
      if (video && container) {
        const isPortrait = video.videoHeight > video.videoWidth;
        container.setAttribute(
          'data-orientation',
          isPortrait ? 'portrait' : 'landscape',
        );
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', handleVideoMetadata);
      return () => {
        video.removeEventListener('loadedmetadata', handleVideoMetadata);
      };
    }
  }, []);

  useEffect(() => {
    const fetchAssetDetails = async (id: string): Promise<void> => {
      try {
        const data = await getAssetMetadata(id);
        setAssetMetadata(data);
        if (data?.subtitles) {
          setSubtitles(data.subtitles);
        }
        const asset: GetAssetResponse = await fetchAssetId(id);
        const conProps = {
          ...(asset?.asset?.playbackPolicy && {
            accessKey: generateAccessKey(
              user?.address!,
              asset?.asset?.playbackPolicy?.webhookContext as WebhookContext,
            ),
          }),
        };
        setConditionalProps(conProps);
      } catch (error) {
        console.error('Failed to fetch asset metadata:', error);
        setAssetMetadata(null);
      }
    };
    fetchAssetDetails(assetId);
  }, [user, assetId, getAssetMetadata, setSubtitles]);

  useEffect(() => {
    resetFadeTimeout();
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentPlayingId && currentPlayingId !== playerId) {
      // Another video started playing, pause this one
      const video = containerRef.current?.querySelector('video');
      if (video && !video.paused) {
        video.pause();
      }
    }
  }, [currentPlayingId, playerId]);

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
    if (onPlay) {
      onPlay();
    }
  };

  return (
    <>
      <Player.Root
        src={src}
        {...conditionalProps}
        volume={1}
        onPlay={handlePlay}
      >
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

            <div className="absolute bottom-0 left-0 right-0">
              <div className="flex items-center justify-between px-5 pb-8">
                <Player.Time className="rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium tabular-nums text-white/90" />

                <div className="flex items-center gap-4">
                  {assetMetadata?.subtitles && <SubtitlesControl />}
                  <Player.FullscreenTrigger className="group relative flex h-10 w-10 cursor-pointer touch-none items-center justify-center rounded-full bg-black/50 hover:bg-black/70">
                    <Player.FullscreenIndicator asChild matcher={false}>
                      <EnterFullscreenIcon className="h-6 w-6 text-white" />
                    </Player.FullscreenIndicator>
                    <Player.FullscreenIndicator asChild>
                      <ExitFullscreenIcon className="h-6 w-6 text-white" />
                    </Player.FullscreenIndicator>
                  </Player.FullscreenTrigger>
                </div>
              </div>

              <Player.Seek
                style={{
                  position: 'absolute',
                  left: 20,
                  right: 20,
                  bottom: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  userSelect: 'none',
                  touchAction: 'none',
                }}
              >
                <Player.Track
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    position: 'relative',
                    flexGrow: 1,
                    borderRadius: 9999,
                    height: 2,
                  }}
                >
                  <Player.SeekBuffer
                    style={{
                      position: 'absolute',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: 9999,
                      height: '100%',
                    }}
                  />
                  <Player.Range
                    style={{
                      position: 'absolute',
                      backgroundColor: 'white',
                      borderRadius: 9999,
                      height: '100%',
                    }}
                  />
                </Player.Track>
                <Player.Thumb
                  style={{
                    display: 'block',
                    width: 12,
                    height: 12,
                    backgroundColor: 'white',
                    borderRadius: 9999,
                  }}
                />
              </Player.Seek>
            </div>
          </div>
        </Player.Container>
      </Player.Root>
    </>
  );
};

export const PlayerLoading = ({
  title,
  description,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) => (
  <div className="relative flex aspect-video w-full flex-col-reverse gap-3 overflow-hidden rounded-sm bg-white/10 px-3 py-2">
    <div className="flex justify-between">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse overflow-hidden rounded-lg bg-white/5" />
        <div className="h-6 w-16 animate-pulse overflow-hidden rounded-lg bg-white/5 md:h-7 md:w-20" />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-pulse overflow-hidden rounded-lg bg-white/5" />
        <div className="h-6 w-6 animate-pulse overflow-hidden rounded-lg bg-white/5" />
      </div>
    </div>
    <div className="h-2 w-full animate-pulse overflow-hidden rounded-lg bg-white/5" />

    {title && (
      <div className="absolute inset-10 flex flex-col items-center justify-center gap-1 text-center">
        <span className="text-lg font-medium text-white">{title}</span>
        {description && (
          <span className="text-sm text-white/80">{description}</span>
        )}
      </div>
    )}
  </div>
);
