import * as Player from '@livepeer/react/player';
import { Src } from '@livepeer/react';
import { PlayIcon, PauseIcon, MuteIcon, UnmuteIcon } from '@livepeer/react/assets';
import { useEffect, useState, useRef } from 'react';
import './Player.css';

// pass the parsed playback info Src[] into the player
export const DemoPlayer: React.FC<{ src: Src[] | null; title: string }> = ({
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
    <Player.Root src={src} autoPlay volume={1}>
      <Player.Container 
        className="player-container"
        onMouseMove={resetFadeTimeout}
        onMouseEnter={() => setControlsVisible(true)}
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
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <div className="text-lg font-semibold text-white">Loading...</div>
          </div>
        </Player.LoadingIndicator>
        <Player.Video title={title} poster={null} />
        <Player.Controls className={`flex items-center justify-center ${controlsVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
          {/* Time display above controls */}
          <div className="absolute right-4 top-[-40px]">
            <Player.Time
              className="text-sm text-white px-2 py-1 bg-black/40 rounded"
              style={{
                fontVariant: "tabular-nums",
              }}
            />
          </div>
          <Player.PlayPauseTrigger className="h-10 w-10">
            <Player.PlayingIndicator asChild matcher={false}>
              <PlayIcon style={{ color: '#EC407A' }} />
            </Player.PlayingIndicator>
            <Player.PlayingIndicator asChild>
              <PauseIcon style={{ color: '#EC407A' }} />
            </Player.PlayingIndicator>
          </Player.PlayPauseTrigger>
          <div
            style={{
              position: "absolute",
              left: 20,
              bottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
            }}
          >
            <Player.MuteTrigger
              style={{
                width: 25,
                height: 25,
                color: '#EC407A'
              }}
            >
              <Player.VolumeIndicator asChild matcher={false}>
                <MuteIcon />
              </Player.VolumeIndicator>
              <Player.VolumeIndicator asChild matcher={true}>
                <UnmuteIcon />
              </Player.VolumeIndicator>
            </Player.MuteTrigger>
            <Player.Volume
              style={{
                position: "relative",
                display: "flex",
                flexGrow: 1,
                height: 20,
                alignItems: "center",
                maxWidth: 60,
                touchAction: "none",
                userSelect: "none",
                color: '#121212'
              }}
            >
              <Player.Track
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  position: "relative",
                  flexGrow: 1,
                  borderRadius: 9999,
                  height: "2px",
                }}
              >
                <Player.Range
                  style={{
                    position: "absolute",
                    backgroundColor: "white",
                    borderRadius: 9999,
                    height: "100%",
                  }}
                />
              </Player.Track>
              <Player.Thumb
                style={{
                  display: "block",
                  width: 12,
                  height: 12,
                  backgroundColor: "white",
                  borderRadius: 9999,
                }}
              />
            </Player.Volume>
          </div>
        </Player.Controls>
      </Player.Container>
    </Player.Root>
  );
};
