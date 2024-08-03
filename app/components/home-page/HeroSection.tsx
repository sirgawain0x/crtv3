'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  HERO_VIDEO_TITLE,
  HERO_NAME,
  HERO_DESCRIPTION,
  HERO_BUTTONS,
} from '../../lib/utils/context';
import { getSrc } from '@livepeer/react/external';
import * as Player from '@livepeer/react/player';
import { PauseIcon, PlayIcon } from '@livepeer/react/assets';

export default function HeroSection() {
  const router = useRouter();
  const LIVEPEER_HERO_PLAYBACK_ID = '9a24u9nsvvkp1gzi';
  return (
    <div className="md:py-18 mx-auto max-w-7xl py-10">
      <div className="flex flex-col items-center justify-between md:flex-row">
        <div className="flex-1 space-y-5 md:space-y-10">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-6xl">
            <span className="relative inline-block">
              <span className="absolute inset-0 bottom-1 left-0 -z-10 h-1/3 w-full bg-orange-500"></span>
              {HERO_NAME.top}
            </span>
            <br />
            <span className="text-orange-500">{HERO_NAME.bottom}</span>
          </h1>
          <p className="text-gray-500">{HERO_DESCRIPTION}</p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0">
            <button
              className="flex items-center space-x-2 rounded-full bg-pink-500 px-6 py-2 text-lg font-normal text-white transition duration-200 hover:bg-pink-600 lg:py-3"
              onClick={() => router.push(HERO_BUTTONS.secondary.href)}
            >
              <PlayIcon className="h-5 w-5" />
              <span>{HERO_BUTTONS.secondary.text}</span>
            </button>
          </div>
        </div>
        <div className="relative mt-8 flex-1 md:ml-8 md:mt-0">
          <div className="relative z-0 h-auto overflow-hidden rounded-2xl shadow-2xl">
            <Player.Root src={getSrc(LIVEPEER_HERO_PLAYBACK_ID)}>
              <Player.Container className="h-full w-full overflow-hidden bg-gray-950">
                <Player.Video
                  title={HERO_VIDEO_TITLE}
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
    </div>
  );
}

export const Blob = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={'100%'}
      viewBox="0 0 578 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M239.184 439.443c-55.13-5.419-110.241-21.365-151.074-58.767C42.307 338.722-7.478 282.729.938 221.217c8.433-61.644 78.896-91.048 126.871-130.712 34.337-28.388 70.198-51.348 112.004-66.78C282.34 8.024 325.382-3.369 370.518.904c54.019 5.115 112.774 10.886 150.881 49.482 39.916 40.427 49.421 100.753 53.385 157.402 4.13 59.015 11.255 128.44-30.444 170.44-41.383 41.683-111.6 19.106-169.213 30.663-46.68 9.364-88.56 35.21-135.943 30.551z"
        fill="currentColor"
      />
    </svg>
  );
};