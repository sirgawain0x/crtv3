import React, { useEffect, useState } from 'react';
import { Text, Heading, Box, Button, Container, Image } from '@chakra-ui/react';
import { Player } from '@livepeer/react';
import { AssetData } from '@app/lib/utils/fetchers/assets';
import { livepeer } from '@app/lib/sdk/livepeer/client';
import { CREATIVE_LOGO_WHT } from '@app/lib/utils/context';

export default function VideoDetailsPage({
  params,
}: {
  params: { slug: string };
}) {
  const [videoDetails, setVideoDetails] = useState();
  const [asset, setAsset] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideoDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`asset/${params.slug}`);
        const data = await response.json();
        setVideoDetails(data);
        // Once video details are fetched, fetch the asset
        await fetchAssetDetails(data.assetId);
      } catch (err) {
        setError('Failed to load video data');
        console.error(err);
      }
      setIsLoading(false);
    };

    fetchVideoDetails();
  }, [params.slug]);

  const fetchAssetDetails = async (assetId: AssetData) => {
    setAssetLoading(true);
    try {
      const assetData = await livepeer?.asset.get(`${assetId.assetId}`);
      console.log('Asset By Id', assetData);
      setAsset(assetData);
    } catch (err) {
      setError('Failed to load asset data');
      console.error(err);
    }
    setAssetLoading(false);
  };

  return (
    <main>
      <Heading p={4}>Video Detail Page</Heading>
      <Box p={4}>Slug: {params.slug}</Box>
      {isLoading || assetLoading ? (
        <Box>Loading...</Box>
      ) : error ? (
        <Box color="red.500">{error}</Box>
      ) : (
        <Container maxW="container.md">
          <Heading size="md" my="4">
            {videoDetails}
          </Heading>
          {asset && <Player playbackId={asset.playbackId} showTitle />}
        </Container>
      )}
    </main>
  );
}
