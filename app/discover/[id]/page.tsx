import { Container, Box } from '@chakra-ui/react';
import { Asset } from 'livepeer/models/components';
import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import VideoDetails from '@app/components/Videos/VideoDetails';

export type VideoDetailsProps = {
  assetData: Asset;
};
const VideoDetailsPage = async ({ assetData }: VideoDetailsProps) => {
  const asset = await fullLivepeer.asset.get(assetData?.id);
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
