import { Asset } from 'livepeer/models/components';
import VideoDetails from '@app/components/Videos/VideoDetails';

type VideoDetailsPageProps = {
  params: {
    id: string;
  };
};

// Fetch asset data from server-side or static props here (example below)
const fetchAssetData = async (id: string): Promise<Asset | null> => {
  // Implement your data fetching logic here, return Asset or null if not found
  return null; // Example placeholder
};

export default async function VideoDetailsPage({
  params,
}: VideoDetailsPageProps) {
  const assetData = await fetchAssetData(params.id);

  if (!assetData) {
    // Handle case where asset data is not found
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
