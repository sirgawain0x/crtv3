import React, { useEffect, useState } from 'react';
import { Text, Heading, Box, Button, Container, Image } from '@chakra-ui/react';
import PlayerComponent from '@app/components/Player/Player';
import { AssetData } from '@app/lib/utils/fetchers/assets';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';

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
      const assetData = await fullLivepeer?.asset.get(`${assetId.id}`);
      console.log('Asset By Id', assetData.asset?.id);
      setAsset(assetData);
    } catch (err) {
      setError('Failed to load asset data');
      console.error(err);
    }
    setAssetLoading(false);
  };

  return (
    <main>
      <h1 className="p-4">Video Detail Page</h1>
      <div className="p-4">Slug: {params.slug}</div>
      {isLoading || assetLoading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red.500' }}>{error}</div>
      ) : (
        <div className="container max-w-md">
          <h1 className="md my-4">{videoDetails}</h1>
          {asset && <PlayerComponent src={asset.playbackId} />}
        </div>
      )}
    </main>
  );
}
