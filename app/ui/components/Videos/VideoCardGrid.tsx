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
    <Box p={5}>
      <SimpleGrid
        minChildWidth="300px"
        spacing="40px"
        autoColumns={'max-content'}
      >
        {assets.map((asset) => (
          <VideoCard key={asset?.id} assetData={asset}/>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default VideoCardGrid;
