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
     * that the sdk is using internally (probably to checkmate the `types` taht makes 
     * up the `Assert` object)
     */
    const { data, error } = await livepeer.asset.getAll();

    console.log('data101: ', data);
  } catch (err: any) {
    /**
     * @dev
     * The `Assert` observed at the console is a selected few that the 
     * sdk added to the `error` object inside a `rawValue` field
     * 
     * @note If only the `error` object is accessed; one would see the
     * entire `zod` validation error
     */
    console.log('error101: ', err.rawValue);
  }

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
          {/* {JSON.stringify(allAssets)} */}
          {/* <VideoCardGrid  />  */}
        </Flex>
      </Box>
    </main>
  );
};
export default AllVideosPage;
