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
import './Player.css';
import { useEffect, useState, useRef, forwardRef } from 'react';
import { CheckIcon, ChevronDownIcon } from "lucide-react";

// pass the parsed playback info Src[] into the player
export const PreviewPlayer: React.FC<{ src: Src[] | null; title: string }> = ({
  src,
  title,
}) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeTimeoutRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleVideoMetadata = () => {
      const video = videoRef.current;
      const container = containerRef.current;
      if (video && container) {
        const isPortrait = video.videoHeight > video.videoWidth;
        container.setAttribute('data-orientation', isPortrait ? 'portrait' : 'landscape');
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
    resetFadeTimeout();
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [src, title]);

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

  return (
    <Player.Root src={src} volume={1}>
      <Player.Container 
        className="player-container"
        ref={containerRef}
        onMouseMove={resetFadeTimeout}
        onTouchStart={() => {
          if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
          }
          setControlsVisible(true);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          resetFadeTimeout();
        }}
      >
        <Player.Video 
          title={title} 
          poster={null} 
          ref={videoRef} 
        />
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 video-controls ${!controlsVisible ? 'fade-out' : ''}`}
        >
          <div className="flex flex-col gap-4">
            {/* Time display above seek bar */}
            <div className="flex justify-end">
              <Player.Time
                className="text-sm text-white px-2 py-1 bg-black/40 rounded"
                style={{
                  fontVariant: "tabular-nums",
                }}
              />
            </div>
            {/* Seek bar */}
            <Player.Seek className="relative flex items-center gap-2">
              <Player.Track className="relative h-1 flex-grow rounded-full bg-white/70">
                <Player.SeekBuffer className="absolute h-full rounded-full bg-black/50" />
                <Player.Range className="absolute h-full rounded-full bg-pink-500" />
              </Player.Track>
              <Player.Thumb className="block h-3 w-3 rounded-full bg-white" />
            </Player.Seek>
            <div className="flex items-center justify-between">
              {/* Left controls */}
              <div className="flex items-center gap-4">
                <Player.PlayPauseTrigger className="h-8 w-8">
                  <Player.PlayingIndicator asChild matcher={false}>
                    <PlayIcon className="text-pink-500" />
                  </Player.PlayingIndicator>
                  <Player.PlayingIndicator asChild>
                    <PauseIcon className="text-pink-500" />
                  </Player.PlayingIndicator>
                </Player.PlayPauseTrigger>
                
                <div className="flex items-center gap-2">
                  <Player.MuteTrigger className="h-6 w-6 text-pink-500">
                    <Player.VolumeIndicator asChild matcher={false}>
                      <MuteIcon />
                    </Player.VolumeIndicator>
                    <Player.VolumeIndicator asChild matcher={true}>
                      <UnmuteIcon />
                    </Player.VolumeIndicator>
                  </Player.MuteTrigger>
                  <Player.Volume
                    className="relative flex items-center gap-2 w-20"
                  >
                    <Player.Track
                      className="relative h-1 flex-grow rounded-full bg-white/70"
                    >
                      <Player.Range
                        className="absolute h-full rounded-full bg-pink-500"
                      />
                    </Player.Track>
                    <Player.Thumb
                      className="block h-3 w-3 rounded-full bg-white"
                    />
                  </Player.Volume>
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2 md:gap-4">
                <Player.RateSelect name="rateSelect">
                  <Player.SelectTrigger
                    className="flex h-6 md:h-8 items-center gap-1 rounded border border-white/20 px-1 md:px-2 text-xs md:text-sm text-white hover:bg-white/10"
                    aria-label="Playback speed"
                  >
                    <Player.SelectValue placeholder="1x" className="min-w-[24px] md:min-w-[32px] mr-2" />
                    <Player.SelectIcon>
                      <ChevronDownIcon className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    </Player.SelectIcon>
                  </Player.SelectTrigger>
                  <Player.SelectPortal>
                    <Player.SelectContent
                      className="rounded-lg bg-gray-800 text-xs md:text-sm text-white/90 p-1"
                    >
                      <Player.SelectViewport>
                        <Player.SelectGroup>
                          <RateSelectItem value={0.5}>0.5x</RateSelectItem>
                          <RateSelectItem value={1}>1x</RateSelectItem>
                          <RateSelectItem value={1.5}>1.5x</RateSelectItem>
                          <RateSelectItem value={2}>2x</RateSelectItem>
                        </Player.SelectGroup>
                      </Player.SelectViewport>
                    </Player.SelectContent>
                  </Player.SelectPortal>
                </Player.RateSelect>

                <Player.PictureInPictureTrigger className="hidden sm:block h-5 w-5 md:h-6 md:w-6 text-white hover:text-white/80">
                  <PictureInPictureIcon className="h-full w-full" />
                </Player.PictureInPictureTrigger>

                <Player.FullscreenTrigger className="h-5 w-5 md:h-6 md:w-6 text-white hover:text-white/80">
                  <Player.FullscreenIndicator asChild matcher={false}>
                    <EnterFullscreenIcon className="h-full w-full" />
                  </Player.FullscreenIndicator>
                  <Player.FullscreenIndicator asChild>
                    <ExitFullscreenIcon className="h-full w-full" />
                  </Player.FullscreenIndicator>
                </Player.FullscreenTrigger>
              </div>
            </div>
          </div>
        </div>
      </Player.Container>
    </Player.Root>
  );
};

const RateSelectItem = forwardRef<HTMLDivElement, Player.RateSelectItemProps>(
    ({ children, ...props }, forwardedRef) => {
      return (
        <Player.RateSelectItem
          className="flex items-center px-3 py-2 text-xs md:text-sm relative rounded-sm hover:bg-white/10 cursor-pointer select-none"
          {...props}
          ref={forwardedRef}
        >
          <Player.SelectItemText>{children}</Player.SelectItemText>
          <Player.SelectItemIndicator
            className="absolute left-1 flex items-center justify-center w-4 md:w-5"
          >
            <CheckIcon className="h-3 w-3 md:h-4 md:w-4" />
          </Player.SelectItemIndicator>
        </Player.RateSelectItem>
      );
    },
);

RateSelectItem.displayName = 'RateSelectItem';