import { memo, useRef, useState } from 'react';
import {
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  MuteIcon,
  PauseIcon,
  PictureInPictureIcon,
  PlayIcon,
  UnmuteIcon,
} from '@livepeer/react/assets';
import { Src } from '@livepeer/react';
import { BiRefresh } from 'react-icons/bi';
import copy from 'copy-to-clipboard';
import { AssetData } from '@app/lib/types';
import { getSrc } from '@livepeer/react/external';
import * as Player from '@livepeer/react/player';
import { custom } from 'zod';

interface PlayerProps {
  src: Src[] | null;
  isPreview?: boolean;
  customSizePercentages?: { width: `${number}%`; height: `${number}%` };
  asset?: AssetData;
}

const PlayerComponent = memo(
  ({
    src,
    //isPreview,
    //customSizePercentages,
    asset, // Add asset to the destructured props
  }: PlayerProps) => {
    return (
      <Player.Root src={src}>
        <Player.Container className="h-full w-full overflow-hidden bg-gray-950">
          <Player.Video title={asset?.name} className="h-full w-full" />
          <Player.Controls className="flex items-center justify-center">
            <Player.PlayPauseTrigger className="h-10 w-10 flex-shrink-0 hover:scale-105">
              <Player.PlayingIndicator asChild matcher={false}>
                <PlayIcon className="h-full w-full" />
              </Player.PlayingIndicator>
              <Player.PlayingIndicator asChild>
                <PauseIcon className="h-full w-full" />
              </Player.PlayingIndicator>
            </Player.PlayPauseTrigger>
          </Player.Controls>
        </Player.Container>
      </Player.Root>
    );
  },
);

PlayerComponent.displayName = 'PlayerComponent'; // Add display name

export default PlayerComponent;
