'use client';
import { getSrc } from '@livepeer/react/external';
import * as Player from '@livepeer/react/player';
import { PauseIcon, PlayIcon } from '@livepeer/react/assets';
import {
  LIVEPEER_FEATURED_PLAYBACK_ID,
  FEATURED_VIDEO_TITLE,
  FEATURED_TEXT,
} from '../../lib/utils/context';

export default function FeaturedVideo() {
  return (
    <div className="flex flex-col items-center justify-between rounded-lg bg-white p-8 shadow-md md:flex-row">
      <div className="text-center md:max-w-md md:text-left">
        <h1 className="text-4xl font-bold text-gray-900">
          <span className="text-red-500">{FEATURED_TEXT.top}</span>
          {FEATURED_TEXT.middle}
        </h1>
        <p className="mt-4 text-gray-700">{FEATURED_TEXT.bottom}</p>
        <div className="mt-6 flex justify-center space-x-4 md:justify-start">
          <button className="rounded-full bg-yellow-400 px-6 py-2 font-semibold text-white shadow-md transition duration-200 hover:bg-yellow-500">
            Get Started
          </button>
          <button className="rounded-full bg-red-500 px-6 py-2 font-semibold text-white shadow-md transition duration-200 hover:bg-red-600">
            How It Works
          </button>
        </div>
      </div>
      <div className="mt-8 md:ml-8 md:mt-0">
        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-200">
          <Player.Root src={getSrc(LIVEPEER_FEATURED_PLAYBACK_ID)}>
            <Player.Container className="h-full w-full overflow-hidden bg-gray-950">
              <Player.Video
                title={FEATURED_VIDEO_TITLE}
                className="h-full w-full"
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
        </div>
      </div>
    </div>
  );
}
