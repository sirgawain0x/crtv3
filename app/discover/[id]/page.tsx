'use client';
import { Asset } from 'livepeer/models/components';
import VideoDetails from '@app/components/Videos/VideoDetails';
import { getDetailPlaybackSource } from '@app/lib/utils/hooks/useDetailPlaybackSources';

type VideoDetailsProps = {
  assetData: Asset;
};

const VideoDetailsPage = ({ assetData }: VideoDetailsProps) => {
  const asset = getDetailPlaybackSource(assetData?.id);
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
