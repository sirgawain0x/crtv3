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
    <Player.Root src={src}>
      <Player.Container 
        className="player-container"
        onMouseMove={resetFadeTimeout}
      >
        <Player.Video title={title} poster={null} />
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 video-controls ${!controlsVisible ? 'fade-out' : ''}`}
        >
          <div className="flex flex-col gap-4">
            {/* Seek bar at bottom */}
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
                
                <Player.Time
                  className="text-sm text-white"
                  style={{
                    fontVariant: "tabular-nums",
                  }}
                />
                
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
              <div className="flex items-center gap-4">
                <Player.RateSelect name="rateSelect">
                  <Player.SelectTrigger
                    className="flex h-8 items-center gap-1 rounded border border-white/20 px-2 text-sm text-white hover:bg-white/10"
                    aria-label="Playback speed"
                  >
                    <Player.SelectValue placeholder="1x" />
                    <Player.SelectIcon>
                      <ChevronDownIcon className="h-4 w-4" />
                    </Player.SelectIcon>
                  </Player.SelectTrigger>
                  <Player.SelectPortal>
                    <Player.SelectContent
                      className="rounded-lg bg-gray-800 text-sm text-white/90 p-1"
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

                <Player.PictureInPictureTrigger className="h-6 w-6 text-white hover:text-white/80">
                  <PictureInPictureIcon />
                </Player.PictureInPictureTrigger>

                <Player.FullscreenTrigger className="h-6 w-6 text-white hover:text-white/80">
                  <Player.FullscreenIndicator asChild matcher={false}>
                    <EnterFullscreenIcon />
                  </Player.FullscreenIndicator>
                  <Player.FullscreenIndicator asChild>
                    <ExitFullscreenIcon />
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
          style={{
            fontSize: '14px',
            borderRadius: '8px',
            display: "flex",
            alignItems: "center",
            paddingRight: 40,
            paddingLeft: 32,
            position: "relative",
            userSelect: "none",
            height: 36,
            transition: 'background-color 0.2s ease',
            cursor: 'pointer',
          }}
          {...props}
          ref={forwardedRef}
        >
          <Player.SelectItemText>{children}</Player.SelectItemText>
          <Player.SelectItemIndicator
            style={{
              position: "absolute",
              left: 8,
              width: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckIcon style={{ width: 16, height: 16 }} />
          </Player.SelectItemIndicator>
        </Player.RateSelectItem>
      );
    },
);

RateSelectItem.displayName = 'RateSelectItem';