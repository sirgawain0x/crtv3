'use client';
import { AssetData } from '@app/lib/types';
import { Box, Container, Heading } from '@chakra-ui/react';
import { useState } from 'react';
import { getSrc } from '@livepeer/react/external';
import * as Player from "@livepeer/react/player";
import { PauseIcon, PlayIcon } from "@livepeer/react/assets";

type VideoDetailsProps = {
  assetData: AssetData;
};

export default function VideoDetails(props: VideoDetailsProps) {
  const [videoDetails, setVideoDetails] = useState();
  const [asset, setAsset] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [error, setError] = useState('');
  const src = getSrc(props?.assetData?.playbackInfo);

  return (
    <main>
      <Heading p={4}>Video Detail Page</Heading>
      <Box p={4}>Asset ID: {props?.assetData.id}</Box>
      {isLoading || assetLoading ? (
        <Box>Loading...</Box>
      ) : error ? (
        <Box color="red.500">{error}</Box>
      ) : (
        <Container maxW="container.md">
          <Heading size="md" my="4">
            {props?.assetData?.name}
          </Heading>
            {props?.assetData?.id && (
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
            )}
        </Container>
      )}
    </main>
  );
}
