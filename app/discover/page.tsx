<<<<<<< Updated upstream
import { livepeer } from '@app/lib/sdk/livepeer/client';
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  Heading,
  Text,
} from '@chakra-ui/react';

const AllVideosPage = async () => {
  try {

    /**
     * @dev
     * The data isn't populating because it fails to pass some `Zod` validation
     * that the sdk is using internally (probably to checkmate the `types` that makes 
     * up the `Asset` object)
     */
    const { data, error } = await livepeer.asset.getAll();

    console.log('data101: ', data);
  } catch (err: any) {
    /**
     * @dev
     * The `Asset` observed at the console is a selected few that the 
     * sdk added to the `error` object inside a `rawValue` field
     * 
     * @note If only the `error` object is accessed; one would see the
     * entire `zod` validation error
     */
    console.log('error101: ', err.rawValue);
  }
=======
import { Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Flex, Heading, Text } from '@chakra-ui/react';
import { livepeer } from '@app/lib/sdk/livepeer/client';
import VideoCardGrid from '@app/ui/components/Videos/VideoCardGrid';
import { AssetData } from '@app/lib/types';

// Simulating assetData fetch from the upload form
const getAssetData = async (): Promise<AssetData[]> => {
  // Placeholder for fetching assetData from an upload form or another source
  return [];
};

const AllVideosPage = async () => {
  let assets: AssetData[] = [];
  let error: string | null = null;

  try {
    const assetsResponse = await livepeer.getAll();
    if (typeof assetsResponse === 'string') {
      error = assetsResponse;
    } else {
      assets = assetsResponse;
    }
  } catch (err) {
    console.error('Failed to fetch assets:', err);
    error = 'Failed to fetch assets.';
  }

  const assetData = await getAssetData();

  console.log("Assets", assets);
  console.log("Asset Data", assetData);
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
          {/* {JSON.stringify(allAssets)} */}
          {/* <VideoCardGrid  />  */}
=======
          {error ? (
            <Text>Error: {error}</Text>
          ) : (
            <VideoCardGrid assets={assets} />
          )}
>>>>>>> Stashed changes
        </Flex>
      </Box>
    </main>
  );
};

export default AllVideosPage;
