import React from 'react';
import { Box, SimpleGrid, Text } from '@chakra-ui/react';
import VideoCard from './VideoCard';
import { AssetData } from '@app/lib/types';

// Add video props to the VideoCardGrid component
interface VideoCardGridProps {
  assetId: AssetData['assetId'];
  videos: AssetData['video'][];
  views: AssetData['views'];
  mintDetails?: AssetData['details'];
  currency?: AssetData['currency'];
}
 
const VideoCardGrid: React.FC<VideoCardGridProps> = ({ videos, views, currency, mintDetails }) => {
  
  if (!videos || videos.length === 0) {
    return <Text>No videos available.</Text>;
  }

  return (
    <Box p={5}>
      <SimpleGrid
        minChildWidth="300px"
        spacing="40px"
        autoColumns={'max-content'}
      >
        {videos.map(video => (
          <VideoCard key={video?.id} video={video} views={views} currency={currency} mintDetails={mintDetails}/>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default VideoCardGrid;
