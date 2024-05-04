import React from 'react';
import { Text, Heading, Box, Container } from '@chakra-ui/react';
import VideoDetailsPage from '@app/ui/components/Videos/Detail/Detail';

export default function VideoDetails() {
  return (
    <Container maxW="7xl" centerContent>
      <Box py={10}>
        <VideoDetailsPage params={{ slug: 'video-slug' }} />
      </Box>
    </Container>
  );
}
