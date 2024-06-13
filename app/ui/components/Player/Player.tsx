import { PauseIcon, PlayIcon } from "@livepeer/react/assets";
import { AssetData } from "@app/lib/types";
import { getSrc } from "@livepeer/react/external";
import * as Player from "@livepeer/react/player";

interface PlayerProps {
  asset: AssetData;
}

const PlayerCardComponent: React.FC<PlayerProps> = ({ asset }) => {
  const src = getSrc(asset?.playbackInfo);
  return (
    <Player.Root src={src}>
      <Player.Container className="h-full w-full overflow-hidden bg-gray-950">
        <Player.Video title={asset?.name} className="h-full w-full" />
        <Player.Controls className="flex items-center justify-center">
          <Player.PlayPauseTrigger className="w-10 h-10 hover:scale-105 flex-shrink-0">
            <Player.PlayingIndicator asChild matcher={false}>
              <PlayIcon className="w-full h-full" />
            </Player.PlayingIndicator>
            <Player.PlayingIndicator asChild>
              <PauseIcon className="w-full h-full" />
            </Player.PlayingIndicator>
          </Player.PlayPauseTrigger>
        </Player.Controls>
      </Player.Container>
    </Player.Root>
  );
};

export default PlayerCardComponent;