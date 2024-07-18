'use client';
import React from 'react';
import { Box, SimpleGrid, Text } from '@chakra-ui/react';
import VideoCard from './VideoCard';
import { AssetData } from '@app/lib/types';


// Add video props to the VideoCardGrid component
interface VideoCardGridProps {
  assets: AssetData[];
}
 
const VideoCardGrid: React.FC<VideoCardGridProps> = ({ assets }) => {
  
  if (!assets || assets.length === 0) {
    return <Text>No videos available.</Text>;
  }

  return (
    <Box p={4}>
      <SimpleGrid columns={[1, 1, 2, 2, 3, 4 ]} gap={4}>
        {assets.map((asset) => (
          <Box key={asset.id}>
            <VideoCard assetData={asset}/>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default VideoCardGrid;
