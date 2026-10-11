"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  HERO_NAME,
  HERO_DESCRIPTION,
  HERO_BUTTONS,
  HERO_VIDEO_TITLE,
} from "../../context/context";
import { Src } from "@livepeer/react";
import { HeroPlayer } from "../Player/HeroPlayer";
import { PlayerLoading } from "../Player/Player";
import { getHeroPlaybackSource } from "../../lib/hooks/livepeer/useHeroPlaybackSource";
import { logger } from '@/lib/utils/logger';

const HeroSection: React.FC = () => {
  const [src, setSrc] = useState<Src[] | null>(null);
  const [heroPlaybackId, setHeroPlaybackId] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;

    const fetchSource = async () => {
      if (!isMounted) return;

      abortController = new AbortController();
      const signal = abortController.signal;

      try {
        const playbackSource = await getHeroPlaybackSource();

        if (!isMounted || signal.aborted) return;

        const hasSource =
          playbackSource != null &&
          Array.isArray(playbackSource.src) &&
          playbackSource.src.length > 0;
        setSrc(hasSource ? playbackSource.src : null);
        setHeroPlaybackId(hasSource ? playbackSource.playbackId : undefined);
        if (!hasSource) {
          setError("No video source available.");
        }
      } catch (err) {
        if (!isMounted || signal.aborted) return;

        // Check if it's an abort error
        if (err instanceof Error && (
          err.name === 'AbortError' ||
          err.message.includes('aborted') ||
          err.message.includes('signal is aborted')
        )) {
          logger.warn('Hero video fetch was aborted:', err.message);
          return; // Don't set error for abort signals
        }

        logger.error("Error fetching playback source:", err);
        setError("Failed to load video.");
      } finally {
        if (isMounted && !signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSource();

    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

  if (error) {
    return <div className="text-center p-4 bg-red-100 rounded-lg">{error}</div>;
  }

  return (
    <div className="md:py-18 mx-auto max-w-7xl py-10">
      <div className="flex flex-col-reverse items-center justify-between md:flex-row">
        <div className="mt-8 flex-1 space-y-5 md:mt-0 md:space-y-10 text-center md:text-left">
          <h1
            className={
              "text-[clamp(3rem,5vw,4rem)] font-bold leading-tight text-gray-900 dark:text-white"
            }
          >
            <span className="relative inline-block">
              <span
                className="absolute left-0 bottom-[0.12em] -z-10 h-[0.28em] w-full bg-orange-500"
                aria-hidden="true"
              />
              {HERO_NAME.first}
            </span>
            <br />
            <span className="text-orange-600">{HERO_NAME.second}</span>
            <br />
            <span className="text-orange-600">{HERO_NAME.third}</span>
          </h1>
          <p className="text-lg text-gray-800 dark:text-gray-200 md:text-xl">
            {HERO_DESCRIPTION}
          </p>
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:justify-center sm:space-x-6 sm:space-y-0 md:justify-start">
            <Link
              href={HERO_BUTTONS.primary.href}
              className={
                "rounded-full bg-pink-600 px-6 py-2 text-lg font-semibold text-white " +
                "transition duration-200 hover:bg-pink-700 lg:py-3"
              }
            >
              {HERO_BUTTONS.primary.text}
            </Link>
            <Link
              href={HERO_BUTTONS.secondary.href}
              className={
                "rounded-full border-2 border-gray-900 px-6 py-2 text-lg font-semibold text-gray-900 " +
                "transition duration-200 hover:bg-gray-900 hover:text-white dark:border-white dark:text-white " +
                "dark:hover:bg-white dark:hover:text-gray-900 lg:py-3"
              }
            >
              {HERO_BUTTONS.secondary.text}
            </Link>
          </div>
        </div>
        <div className="w-full md:ml-8 md:flex-1">
          <div className="relative w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
            {loading ? (
              <PlayerLoading title="Loading..." />
            ) : (
              <div className="relative touch-none">
                {src ? (
                  <HeroPlayer
                    src={src}
                    title={HERO_VIDEO_TITLE}
                    playbackId={heroPlaybackId}
                  />
                ) : (
                  <div className="text-center p-4 bg-red-100 rounded-lg">
                    No video source available.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

export const Blob = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={"100%"}
      viewBox="0 0 578 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={
          "M239.184 439.443c-55.13-5.419-110.241-21.365-151.074-58.767C42.307 338.722-7.478 282.729.938 " +
          "221.217c8.433-61.644 78.896-91.048 126.871-130.712 34.337-28.388 70.198-51.348 112.004-66.78C282.34 8.024 " +
          "325.382-3.369 370.518.904c54.019 5.115 112.774 10.886 150.881 49.482 39.916 40.427 49.421 100.753 53.385 " +
          "157.402 4.13 59.015 11.255 128.44-30.444 170.44-41.383 41.683-111.6 19.106-169.213 30.663-46.68 9.364-88.56 " +
          "35.21-135.943 30.551z"
        }
        fill="currentColor"
      />
    </svg>
  );
};
