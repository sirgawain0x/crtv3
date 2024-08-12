import * as Player from '@livepeer/react/player';
import { Src } from '@livepeer/react';
import { PlayIcon, PauseIcon } from '@livepeer/react/assets';

// pass the parsed playback info Src[] into the player
export const DemoPlayer: React.FC<{ src: Src[] | null; title: string }> = ({
  src,
  title,
}) => {
  if (!src || src.length === 0) {
    return <div>No video source available.</div>;
  }
  return (
    <Player.Root src={src}>
      <Player.Container>
        <Player.Video title={title} poster={null} />
        <Player.Controls className="flex items-center justify-center">
          <Player.PlayPauseTrigger className="h-10 w-10">
            <Player.PlayingIndicator asChild matcher={false}>
              <PlayIcon style={{ color: '#EC407A' }} />
            </Player.PlayingIndicator>
            <Player.PlayingIndicator asChild>
              <PauseIcon style={{ color: '#EC407A' }} />
            </Player.PlayingIndicator>
          </Player.PlayPauseTrigger>
        </Player.Controls>
      </Player.Container>
    </Player.Root>
  );
};
