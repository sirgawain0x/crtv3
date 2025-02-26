'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from './Subtitles';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { toast } from 'sonner';
import { fetchAssetId } from '@app/api/livepeer/actions';
import { generateAccessKey } from '@app/lib/access-key';
import { WebhookContext } from '@app/api/livepeer/token-gate/route';
import { useActiveAccount } from 'thirdweb/react';
import { GetAssetResponse } from 'livepeer/models/operations';
import { useVideo } from '@app/context/VideoContext';

interface PlayerComponentProps {
  src: Src[] | null;
  assetId: string;
  title: string;
  accessKey?: string;
  onPlay?: () => void;
}

interface ConditionalProps {
  accessKey?: string;
}

export const PlayerComponent: React.FC<PlayerComponentProps> = ({
  src,
  assetId,
  title,
  onPlay,
}) => {
  // Initialize all state variables at the top level
  const [assetMetadata, setAssetMetadata] = useState<AssetMetadata | null>(
    null,
  );
  const [controlsVisible, setControlsVisible] = useState(true);
  const [conditionalProps, setConditionalProps] = useState<ConditionalProps>(
    {},
  );

  const fadeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const subtitlesRef = useRef<AssetMetadata['subtitles']>();

  const { currentPlayingId, setCurrentPlayingId } = useVideo();
  // Generate a stable ID for this player instance
  const playerId = useRef(Math.random().toString(36).substring(7)).current;

  const activeAccount = useActiveAccount();
  const { getAssetMetadata } = useOrbisContext();

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
        // First fetch the asset metadata
        const data = await getAssetMetadata?.(id);
        if (!data) {
          console.warn('No metadata found for asset:', id);
          setAssetMetadata(null);
          return;
        }

        // Safely serialize the data to a plain object before setting in state
        try {
          const serializedData = JSON.parse(JSON.stringify(data));
          setAssetMetadata(serializedData);

          // Set subtitles if they exist
          if (serializedData?.subtitles) {
            subtitlesRef.current = serializedData.subtitles;
          }
        } catch (serializeError) {
          console.error('Error serializing asset metadata:', serializeError);
        }

        // Only fetch playback policy if we have an active account
        if (activeAccount?.address) {
          try {
            const asset: GetAssetResponse = await fetchAssetId(id);
            if (asset?.asset?.playbackPolicy?.webhookContext) {
              const webhookContext = asset.asset.playbackPolicy
                .webhookContext as WebhookContext;
              const accessKey = await generateAccessKey(
                activeAccount.address,
                webhookContext,
              );
              setConditionalProps({ accessKey });
            }
          } catch (policyError) {
            console.error('Failed to fetch playback policy:', policyError);
          }
        }
      } catch (error) {
        console.error('Failed to fetch asset metadata:', error);
        setAssetMetadata(null);
        // Only show toast for metadata fetch failures
        if (!assetMetadata) {
          toast.error('Failed to load video details');
        }
      }
    };

    if (assetId) {
      fetchAssetDetails(assetId).catch((error) => {
        console.error('Unhandled error in fetchAssetDetails:', error);
      });
    }
  }, [activeAccount, assetId, assetMetadata, getAssetMetadata]);

  const resetFadeTimeout = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    setControlsVisible(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2000);
  }, []);

  useEffect(() => {
    resetFadeTimeout();
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [resetFadeTimeout]);

  useEffect(() => {
    if (currentPlayingId && currentPlayingId !== playerId) {
      // Another video started playing, pause this one
      const video = containerRef.current?.querySelector('video');
      if (video && !video.paused) {
        video.pause();
      }
    }
  }, [currentPlayingId, playerId]);

  const handleFullscreenToggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error('Failed to toggle fullscreen');
    }
  }, []);

  useEffect(() => {
    if (assetMetadata?.subtitles) {
      subtitlesRef.current = assetMetadata.subtitles;
    }
  }, [assetMetadata]);

  try {
    return (
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-lg bg-black"
        onMouseEnter={() => setControlsVisible(true)}
        onMouseLeave={() => setControlsVisible(false)}
        onMouseMove={resetFadeTimeout}
      >
        {src && Array.isArray(src) && src.length > 0 ? (
          <SubtitlesProvider initialSubtitles={subtitlesRef.current}>
            <Player.Root src={src} volume={1}>
              <Player.Container>
                <Player.Video
                  title={title}
                  style={{ height: '100%', width: '100%' }}
                  ref={videoRef}
                  playsInline
                  controls={false}
                  onPlay={() => {
                    setCurrentPlayingId?.(playerId);
                    if (typeof onPlay === 'function') {
                      onPlay();
                    }
                  }}
                  {...conditionalProps}
                />
                <SubtitlesDisplay />
                <Player.Controls
                  className={`absolute bottom-0 left-0 right-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-20 transition-opacity duration-300 ${
                    controlsVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {/* Progress bar */}
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

                  {/* Controls bar */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Left controls group */}
                    <div className="flex items-center gap-3">
                      <Player.PlayPauseTrigger className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm transition hover:bg-white/40">
                        <Player.PlayingIndicator asChild matcher={false}>
                          <PlayIcon className="h-5 w-5 text-white" />
                        </Player.PlayingIndicator>
                        <Player.PlayingIndicator asChild>
                          <PauseIcon className="h-5 w-5 text-white" />
                        </Player.PlayingIndicator>
                      </Player.PlayPauseTrigger>

                      <div className="flex items-center gap-2">
                        <Player.MuteTrigger className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm transition hover:bg-white/40">
                          <Player.VolumeIndicator asChild matcher={false}>
                            <MuteIcon className="h-5 w-5 text-white" />
                          </Player.VolumeIndicator>
                          <Player.VolumeIndicator asChild matcher={true}>
                            <UnmuteIcon className="h-5 w-5 text-white" />
                          </Player.VolumeIndicator>
                        </Player.MuteTrigger>
                      </div>
                    </div>

                    {/* Center controls group - Time */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Player.Time className="text-sm font-medium text-white" />
                    </div>

                    {/* Right controls group */}
                    <div className="flex items-center gap-2">
                      <SubtitlesControl />
                      <Player.FullscreenTrigger className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm transition hover:bg-white/40">
                        <Player.FullscreenIndicator asChild>
                          <ExitFullscreenIcon className="h-5 w-5 text-white" />
                        </Player.FullscreenIndicator>
                        <Player.FullscreenIndicator matcher={false} asChild>
                          <EnterFullscreenIcon className="h-5 w-5 text-white" />
                        </Player.FullscreenIndicator>
                      </Player.FullscreenTrigger>
                    </div>
                  </div>
                </Player.Controls>
              </Player.Container>
            </Player.Root>
          </SubtitlesProvider>
        ) : (
          <PlayerLoading title={title} />
        )}
      </div>
    );
  } catch (error) {
    console.error('Error rendering PlayerComponent:', error);
    return <PlayerLoading title={title} description="Error loading player" />;
  }
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
