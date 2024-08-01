'use client';
import { getSrc } from '@livepeer/react/external';
import * as Player from '@livepeer/react/player';
import {
  FEATURED_TEXT,
  FEATURED_VIDEO_TITLE,
  LIVEPEER_FEATURED_PLAYBACK_ID,
} from '@app/lib/utils/context';
import { PauseIcon, PlayIcon } from '@livepeer/react/assets';

export default function FeaturedVideo() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
        <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-lg">
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
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-4 text-lg text-white">
            <div className="line-clamp-1">
              World of Warcraft: Shadowlands - Chains of Domination Patch 9.1
              Trailer (2021) - PC
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
              Featured Video
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Explore the World of Warcraft: Shadowlands
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Dive into the latest expansion of the iconic MMORPG, with a
              captivating cinematic trailer showcasing the new Chains of
              Domination content.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
