import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
// Import videojs-contrib-quality-levels for Livepeer's adaptive bitrate
import 'videojs-contrib-quality-levels';
// Import videojs-http-source-selector for quality selection UI
import 'videojs-http-source-selector';

interface VideoPlayerProps {
  playbackId?: string | undefined;
  playbackUrl?: string | undefined;
  subtitles?: string | undefined /* {
    label: string;
    language: string;
    url: string;
  } */;
  thumbnail?: string | undefined;
  height?: string | number;
  width?: string | number;
  autoplay?: boolean;
}

export const VideoJSPlayer: React.FC<VideoPlayerProps> = ({
  playbackId,
  playbackUrl,
  thumbnail,
  subtitles,
  //   height = 480,
  //   width = 854,;
  autoplay = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { getAssetMetadata } = useOrbisContext();

  if (!playbackId && !playbackUrl) {
    throw new Error('Either playbackId or playbackUrl must be provided');
  }

  useEffect(() => {
    if (!videoRef.current) return;

    // Construct Livepeer URLs
    const playbackUrl = `https://livepeercdn.com/hls/${playbackId}/index.m3u8`;

    // Initialize video.js player with Livepeer-specific configuration
    const player = videojs(
      videoRef.current,
      {
        controls: true,
        fluid: true,
        responsive: true,
        playbackRates: [0.75, 0.9, 1, 1.1, 1.25, 1.5],
        html5: {
          vhs: {
            overrideNative: true,
            useDevicePixelRatio: true,
            enableLowInitialPlaylist: true,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        sources: [
          {
            src: playbackUrl,
            type: 'application/x-mpegURL',
          },
        ],
        poster: thumbnail,
        autoplay: autoplay,
        plugins: {
          httpSourceSelector: {
            default: 'auto',
          },
        },
      },
      () => {
        // Player is ready
        console.log('Player ready');

        // Enable HTTP Source Selector plugin
        if (player) {
          player.usingPlugin('httpSourceSelector');

          // Handle error events
          player.on('error', (error: any) => {
            console.error('Video.js error:', error);
          });
        }
      },
    );

    // Add quality level change listener
    // player?.on('change', () => {
    //   console.log('Quality level changed');
    // });

    if (playbackId) {
      const assetMetadata = getAssetMetadata(playbackId);

      // Add subtitles/captions if provided
      // subtitles.forEach(subtitle => {
      if (subtitles !== '') {
        player.addRemoteTextTrack(
          {
            kind: 'subtitles',
            srclang: 'en', // subtitles.language,
            label: 'English', // subtitles.label,
            src: '',
            default: true, // subtitles.language === 'en',
          },
          false,
        );
      }
      // });
    }
  }, [playbackId, subtitles, thumbnail, autoplay, getAssetMetadata]);

  return (
    <div data-vjs-player>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered vjs-theme-city"
        playsInline
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};