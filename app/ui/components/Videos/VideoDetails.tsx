'use client';
import { LivepeerCacheAsset, AssetData } from '@app/lib/types';
import { Box, Container, Heading } from '@chakra-ui/react';
import { Player } from '@livepeer/react';
import { useState } from 'react';

type VideoDetailsProps = {
  asset: LivepeerCacheAsset;
  assetData: AssetData;
};

export default function VideoDetails(props: VideoDetailsProps) {
  const [videoDetails, setVideoDetails] = useState();
  const [asset, setAsset] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <main>
      <Heading p={4}>Video Detail Page</Heading>
      <Box p={4}>Asset ID: {props?.asset.id}</Box>
      {isLoading || assetLoading ? (
        <Box>Loading...</Box>
      ) : error ? (
        <Box color="red.500">{error}</Box>
      ) : (
        <Container maxW="container.md">
          <Heading size="md" my="4">
            {props?.assetData?.title}
          </Heading>
            {props?.asset.id && <Player playbackId={props?.asset.playbackId} showTitle />}
        </Container>
      )}
    </main>
  );
}
