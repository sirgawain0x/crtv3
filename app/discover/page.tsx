import { Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Flex, Heading, Text } from '@chakra-ui/react';
import VideoCardGrid from '@app/ui/components/Videos/VideoCardGrid';
import { AssetData } from '@app/lib/types';
import { fetchAllAssets } from '@app/lib/utils/fetchers/livepeer/livepeerApi';
import { Suspense } from 'react';

async function AllVideosContent() {
  let assets: AssetData[] = [];
  let error: string | null = null;

  try {
    assets = await fetchAllAssets();
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
        <Flex flexDirection="column" my={10} gap={5} maxW="md">
          <Text>This is the Discover page.</Text>
          <Suspense fallback={<div>Loading...</div>}>
            <AllVideosContent />
          </Suspense>
        </Flex>
      </Box>
    </main>
  );
}
