import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Heading,
  Text,
} from '@chakra-ui/react';
import VideoCardGrid from '@app/components/Videos/VideoCardGrid';
import { AssetData } from '@app/lib/types';
import { livepeer } from '@app/lib/sdk/livepeer/client';
import { Suspense } from 'react';

async function AllVideosContent() {
  let assets: AssetData[] = [];
  let error: string | null = null;

  try {
    const assets = await livepeer.asset.getAll();
  } catch (err: any) {
    console.error('Failed to fetch assets:', err);
    error = 'Failed to fetch assets.';
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return <VideoCardGrid assets={assets} />;
}

export default async function AllVideosPage() {
  return (
    <main>
      <Box my={10} p={4}>
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">
              <span role="img" aria-label="home">
                🏠
              </span>{' '}
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Discover</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </Box>
      <Box>
        <Heading mb={10}>Discover Content</Heading>
        <Text>This is the Discover page.</Text>
        <Suspense fallback={<div>Loading...</div>}>
          <AllVideosContent />
        </Suspense>
      </Box>
    </main>
  );
}
