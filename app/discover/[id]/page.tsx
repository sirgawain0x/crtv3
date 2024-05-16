
import { Container, Box } from '@chakra-ui/react';
import { AssetData } from '@app/lib/types';
import { livepeer } from '@app/lib/sdk/livepeer/client';
import VideoDetails from '@app/ui/components/Videos/VideoDetails';

export type VideoDetailsProps = {
  assetData: AssetData;
};
const VideoDetailsPage = async ({ assetData }: VideoDetailsProps) => {
  const asset = await livepeer.getById(assetData?.assetId);
  console.log('asset; ', asset);

  return (
    <Container maxW="7xl" centerContent>
      <Box py={10}>
        <VideoDetails asset={asset} assetData={assetData} />
      </Box> 
    </Container>
  );
}

export default VideoDetailsPage;
