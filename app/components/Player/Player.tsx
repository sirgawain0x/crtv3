'use client';
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
import * as Player from '@livepeer/react/player';
//import { Skeleton } from '../ui/skeleton';

export const PlayerComponent: React.FC<{
  src: Src[] | null;
  title: string;
}> = ({ src, title }) => {
  // if (!src) {
  //   return (
  //     <div className={'relative flex w-full'}>
  //       <div className="absolute left-1/2 top-1/2 translate-x-1/2 translate-y-1/2">
  //         <Skeleton className="h-40 w-[250px]" />
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <>
      <Player.Root src={src}>
        <Player.Container className="h-full w-full overflow-hidden bg-gray-950">
          <Player.Video title={title} className="h-full w-full" poster={null} />
          <Player.Controls className="flex items-center justify-center">
            <Player.PlayPauseTrigger className="h-10 w-10 flex-shrink-0 hover:scale-105">
              <Player.PlayingIndicator asChild matcher={false}>
                <PlayIcon
                  className="h-full w-full"
                  style={{
                    color: '#1A202C',
                    backgroundImage: 'linear-gradient(45deg, #EC407A, #FACB80)',
                  }}
                />
              </Player.PlayingIndicator>
              <Player.PlayingIndicator asChild>
                <PauseIcon
                  className="h-full w-full"
                  style={{ color: '#EC407A' }}
                />
              </Player.PlayingIndicator>
            </Player.PlayPauseTrigger>
            <div className="flex justify-between gap-4">
              <div className="absolute bottom-0 left-0 mx-2 flex items-center justify-start gap-2.5 sm:flex-1 md:flex-[1.5]">
                <Player.LiveIndicator
                  matcher={false}
                  className="flex items-center gap-2"
                >
                  <Player.Time
                    className="select-none text-sm tabular-nums"
                    style={{ color: '#EC407A' }}
                  />
                </Player.LiveIndicator>
              </div>
              <div className="absolute bottom-0 right-0 flex items-center justify-end gap-2.5 sm:flex-1 md:flex-[1.5]">
                <Player.FullscreenTrigger className="h-6 w-6 flex-shrink-0 transition hover:scale-110">
                  <Player.FullscreenIndicator asChild>
                    <ExitFullscreenIcon
                      className="h-full w-full"
                      style={{ color: '#EC407A' }}
                    />
                  </Player.FullscreenIndicator>
                  <Player.FullscreenIndicator matcher={false} asChild>
                    <EnterFullscreenIcon
                      className="h-full w-full"
                      style={{ color: '#EC407A' }}
                    />
                  </Player.FullscreenIndicator>
                </Player.FullscreenTrigger>
              </div>
            </div>
          </Player.Controls>
        </Player.Container>
      </Player.Root>
    </>
  );
};
