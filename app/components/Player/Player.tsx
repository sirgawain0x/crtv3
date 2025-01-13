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
import { useActiveAccount } from 'thirdweb/react';
import { GetAssetResponse } from 'livepeer/models/operations';

interface PlayerComponentProps {
  src: Src[] | null;
  assetId: string;
  title: string;
  accessKey?: string;
}

export const PlayerComponent: React.FC<PlayerComponentProps> = ({
  src,
  assetId,
  title,
  accessKey,
}) => {
  const [assetMetadata, setAssetMetadata] = useState<AssetMetadata | null>(
    null,
  );
  const [controlsVisible, setControlsVisible] = useState(true);
  const [conditionalProps, setConditionalProps] = useState<any>({});
  const fadeTimeoutRef = useRef<NodeJS.Timeout>();

  const activeAccount = useActiveAccount();

  const { getAssetMetadata } = useOrbisContext();
  const { setSubtitles } = useSubtitles();

  useEffect(() => {
    const fetchAssetDetails = async (id: string): Promise<void> => {
      try {
        const data = await getAssetMetadata(id);
        // Ensure we're working with a plain object
        const plainData = data ? JSON.parse(JSON.stringify(data)) : null;
        setAssetMetadata(plainData);
        plainData?.subtitles && setSubtitles(plainData.subtitles);
        const asset: GetAssetResponse = await fetchAssetId(id);
        const conProps = {
          ...(asset?.asset?.playbackPolicy && {
            accessKey: generateAccessKey(
              activeAccount?.address!,
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
  }, [activeAccount, assetId, getAssetMetadata, setSubtitles]);

  useEffect(() => {
    resetFadeTimeout();
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  const resetFadeTimeout = () => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    setControlsVisible(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2000);
  };

  return (
    <>
      <Player.Root src={src} {...conditionalProps}>
        <Player.Container
          className="player-container relative aspect-video w-full overflow-hidden bg-gray-950"
          onMouseMove={resetFadeTimeout}
          onMouseEnter={resetFadeTimeout}
          onMouseLeave={() => {
            if (fadeTimeoutRef.current) {
              clearTimeout(fadeTimeoutRef.current);
            }
            setControlsVisible(false);
          }}
        >
          <SubtitlesProvider>
            <Player.Video title={title} className="h-full w-full" poster={null} />
            <SubtitlesDisplay 
              style={{
                position: 'absolute',
                bottom: '10%',
                width: '100%',
                textAlign: 'center',
                color: 'white',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}
            />
            <SubtitlesControl />
          </SubtitlesProvider>

          <Player.LoadingIndicator
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "black",
            }}
          >
            Loading...
          </Player.LoadingIndicator>

          <Player.ErrorIndicator
            matcher="all"
            style={{
              position: "absolute",
              inset: 0,
              height: "100%",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "black",
            }}
          >
            An error occurred. Trying to resume playback...
          </Player.ErrorIndicator>

          <div 
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 video-controls ${!controlsVisible ? 'fade-out' : ''}`}
          >
            <div className="flex flex-col gap-4">
              {/* Seek bar */}
              <Player.Seek className="relative flex items-center gap-2">
                <Player.Track className="relative h-1 flex-grow rounded-full bg-white/70">
                  <Player.SeekBuffer className="absolute h-full rounded-full bg-black/50" />
                  <Player.Range className="absolute h-full rounded-full bg-pink-500" />
                </Player.Track>
                <Player.Thumb className="block h-3 w-3 rounded-full bg-white" />
              </Player.Seek>

              {/* Controls row */}
              <div className="flex items-center justify-between">
                {/* Left controls */}
                <div className="flex items-center gap-4">
                  <Player.PlayPauseTrigger className="h-8 w-8">
                    <Player.PlayingIndicator asChild matcher={false}>
                      <PlayIcon className="h-full w-full text-pink-500" />
                    </Player.PlayingIndicator>
                    <Player.PlayingIndicator asChild>
                      <PauseIcon className="h-full w-full text-pink-500" />
                    </Player.PlayingIndicator>
                  </Player.PlayPauseTrigger>

                  <Player.Time
                    className="text-sm text-white tabular-nums"
                  />

                  <div className="flex items-center gap-2">
                    <Player.MuteTrigger className="h-6 w-6 text-pink-500">
                      <Player.VolumeIndicator asChild matcher={false}>
                        <MuteIcon className="h-full w-full" />
                      </Player.VolumeIndicator>
                      <Player.VolumeIndicator asChild matcher={true}>
                        <UnmuteIcon className="h-full w-full" />
                      </Player.VolumeIndicator>
                    </Player.MuteTrigger>
                    <Player.Volume className="relative flex items-center gap-2 w-20">
                      <Player.Track className="relative h-1 flex-grow rounded-full bg-white/70">
                        <Player.Range className="absolute h-full rounded-full bg-pink-500" />
                      </Player.Track>
                      <Player.Thumb className="block h-3 w-3 rounded-full bg-white" />
                    </Player.Volume>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-4">
                  {assetMetadata?.subtitles && <SubtitlesControl />}
                  
                  <Player.FullscreenTrigger className="h-6 w-6 text-pink-500 hover:text-pink-400">
                    <Player.FullscreenIndicator asChild>
                      <ExitFullscreenIcon className="h-full w-full" />
                    </Player.FullscreenIndicator>
                    <Player.FullscreenIndicator matcher={false} asChild>
                      <EnterFullscreenIcon className="h-full w-full" />
                    </Player.FullscreenIndicator>
                  </Player.FullscreenTrigger>
                </div>
              </div>
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
