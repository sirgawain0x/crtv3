'use client';
import { memo } from 'react';
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
import { AssetData } from '@app/lib/types';
import { getSrc } from '@livepeer/react/external';
import * as Player from '@livepeer/react/player';
import { Skeleton } from '../ui/skeleton';

interface PlayerProps {
  src: Src[] | null;
  isPreview?: boolean;
  customSizePercentages?: { width: `${number}%`; height: `${number}%` };
  asset?: AssetData; // Add asset to the props
}

const PlayerComponent = memo(
  ({
    src,
    //isPreview,
    //customSizePercentages,
    asset, // Add asset to the destructured props
  }: PlayerProps) => {
    if (!src) {
      return (
        <div className={'relative flex h-full w-full bg-black'}>
          <div className="absolute left-1/2 top-1/2 translate-x-1/2 translate-y-1/2">
            <Skeleton className="h-40 w-[250px]" />
          </div>
        </div>
      );
    }
    return (
      <>
        <Player.Root src={getSrc(asset?.playbackInfo)}>
          <Player.Container className="h-full w-full overflow-hidden bg-gray-950">
            <Player.Video
              title={asset?.name}
              className="h-full w-full"
              poster={null}
            />
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
      </>
    );
  },
);

PlayerComponent.displayName = 'PlayerComponent'; // Add display name

export default PlayerComponent;
