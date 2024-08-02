import { Container, Box } from '@chakra-ui/react';
import { AssetData } from '@app/lib/types';
import { livepeer } from '@app/lib/sdk/livepeer/client';
import VideoDetails from '@app/components/Videos/VideoDetails';

export type VideoDetailsProps = {
  assetData: AssetData;
};
const VideoDetailsPage = async ({ assetData }: VideoDetailsProps) => {
  const asset = await livepeer.asset.get(assetData?.id);
  console.log('asset; ', asset);

  return (
    <div className="container max-w-7xl content-center">
      <div className={'py-10'}>
        <VideoDetails assetData={assetData} />
      </div>
    </div>
  );
};

export default VideoDetailsPage;
