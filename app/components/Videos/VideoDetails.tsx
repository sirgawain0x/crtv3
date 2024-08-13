'use client';
import { Asset } from 'livepeer/models/components';
import { useState, useEffect } from 'react';
import { getSrc } from '@livepeer/react/external';
import * as Player from '@livepeer/react/player';
import { PauseIcon, PlayIcon } from '@livepeer/react/assets';
import { Skeleton } from '@app/components/ui/skeleton';
import { getDetailPlaybackSource } from '@app/lib/utils/hooks/useDetailPlaybackSources';

type VideoDetailsProps = {
  assetData: Asset;
};

export default function VideoDetails(props: VideoDetailsProps) {
  const [videoDetails, setVideoDetails] = useState<any>();
  const [asset, setAsset] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAsset() {
      try {
        const assetResponse = await getDetailPlaybackSource(
          props?.assetData?.id,
        );
        setAsset(assetResponse);
        setIsLoading(false);
      } catch (error) {
        setError('Failed to load video details.');
        setIsLoading(false);
      }
    }

    if (props?.assetData?.id) {
      fetchAsset();
    }
  }, [props?.assetData?.id]);

  const src = getSrc(props?.assetData?.playbackId);

  return (
    <main>
      <h1 className={'p-4'}>Video Detail Page</h1>
      <div className={'p-4'}>Asset ID: {props?.assetData.id}</div>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-4 w-[550px]" />
        </div>
      ) : error ? (
        <div color="red.500">{error}</div>
      ) : (
        <div className="container max-w-md">
          <h2 className={'size-md my-4'}>{props?.assetData?.name}</h2>
          {props?.assetData?.id && (
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
          )}
        </div>
      )}
    </main>
  );
}
