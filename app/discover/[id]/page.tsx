import { Asset } from 'livepeer/models/components';
import { GetAssetResponse } from 'livepeer/models/operations';
import VideoDetails from '@app/components/Videos/VideoDetails';
import { fetchAssetId } from '@app/api/livepeer/actions';

type VideoDetailsPageProps = {
  params: {
    id: string;
  };
};

const fetchAssetData = async (id: string): Promise<Asset | null> => {
  const response: GetAssetResponse | null = await fetchAssetId(id);

  if (response) {
    return response.asset?.id === id ? response.asset : null;
  }

  return null; // Return null if the response doesn't match the expected structure
};

export default async function VideoDetailsPage({
  params,
}: VideoDetailsPageProps) {
  const assetData: Asset | null = await fetchAssetData(params.id);

  if (!assetData) {
    return <div>Asset not found</div>;
  }

  return (
    <div className="container max-w-7xl content-center">
      <div className="py-10">
        <VideoDetails asset={assetData} />
      </div>
    </div>
  );
}
