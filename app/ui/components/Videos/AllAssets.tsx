import React, { useState, useEffect } from 'react';
import { SimpleGrid, Heading, Box, Spinner } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import VideoCardGrid from './VideoCardGrid'; // Ensure this component expects the correct props type.
import { useLivepeerClient } from '@app/ui/hooks/useLivepeerClient';
import { Player, LivepeerConfig } from '@livepeer/react';

export default function AllAssets() {
  return (
    <section>
      <LivepeerConfig client={useLivepeerClient}>
        <SimpleGrid spacing={4} minChildWidth="350px" mb={12}>
          <Heading>All Videos</Heading>
          <VideoCardGrid videos={[]}/>
        </SimpleGrid>
      </LivepeerConfig>
    </section>
  );
}
