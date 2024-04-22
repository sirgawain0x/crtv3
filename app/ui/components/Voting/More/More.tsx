'use client';
import React from 'react';
import {
  Box,
  Heading,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Grid,
  GridItem,
  Container,
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { useActiveAccount } from 'thirdweb/react';
import { truncateAddress } from '@app/lib/utils/shortenAddress';
import { useRouter, useSearchParams } from 'next/navigation';
import { Voting } from '@app/ui/components/Voting/Voting';
import ClaimPoap from '@app/ui/components/Voting/ClaimPoap';

/**
 * Renders the "More" component.
 *
 * @returns JSX.Element
 */
export default function MoreOptions() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const searchParams = useSearchParams();

  // Correct use of searchParams
  const end = searchParams.get('end');
  const start = searchParams.get('start');
  const title = searchParams.get('title');
  const body = searchParams.get('body');
  const choices = JSON.parse(searchParams.get('choices') || '[]');
  const snapshot = searchParams.get('snapshot');
  const creator = searchParams.get('creator');
  const score = searchParams.get('score');
  const scores = searchParams.get('scores') || '{}';
  const identifier = searchParams.get('identifier');

  /**
   * Opens a new browser window to display the details of a specific block on PolygonScan.
   * @param id - The ID of the block to navigate to.
   */
  const goTo = (id: any) => {
    let url = `https://polygonscan.com/block/${id}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Box padding={4}>
        <Breadcrumb
          spacing="8px"
          mb={4}
          separator={<ChevronRightIcon color="gray.500" />}
        >
          <BreadcrumbItem>
            <span role="img" aria-label="home">
              🏠
            </span>{' '}
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbItem>
            <BreadcrumbLink href="/vote">Vote</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>Details</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </Box>
      <Grid
        templateColumns={['repeat(1, 1fr)', 'repeat(1, 1fr)', 'repeat(2, 1fr)']}
        gap={6}
        p={4}
      >
        <GridItem colSpan={[1, 1, 1]}>
          <Box padding={4}>
            <Box>
              <Heading>{title}</Heading>
            </Box>
            <Box>
              <Text>{body}</Text>
            </Box>
          </Box>
        </GridItem>
        <GridItem colSpan={[1, 1, 1]}>
          <Box>
            <Box
              padding={5}
              marginBottom={5}
              maxWidth={'100vw'}
              cursor="pointer"
            >
              <Box
                bgGradient="linear(to-l, #FFCC80, #D32F2F, #EC407A)"
                padding={2}
                display="flex"
                borderTopLeftRadius={10}
                borderTopRightRadius={10}
                flexDirection="row"
              >
                <Heading size={'md'} color="white">
                  Details
                </Heading>
              </Box>
              <Box
                border={'2px solid #ec407a'}
                borderBottomRadius={10}
                padding={10}
              >
                <Box padding={2}>
                  <Text>{`Creator: ${creator ? truncateAddress(creator) : 'Unknown'}`}</Text>
                  <Text
                    onClick={() => goTo(snapshot)}
                  >{`Snapshot:  ${snapshot}`}</Text>
                </Box>
                <Box background={'black'} padding={2} borderRadius={10}>
                  <Box display="flex" flexDirection="row">
                    <Text color="white">{`Start Date: ${start}`}</Text>
                  </Box>
                  <Box display="flex" flexDirection="row">
                    <Text color="white">{`End Date: ${end}`}</Text>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box
              padding={5}
              marginBottom={5}
              cursor="pointer"
              minW={['100vw', '100vw', '100vw', '20px']}
              maxWidth={'100vw'}
            >
              <Box
                bgGradient="linear(to-l, #FFCC80, #D32F2F, #EC407A)"
                padding={2}
                display="flex"
                borderTopLeftRadius={10}
                borderTopRightRadius={10}
                flexDirection="row"
              >
                <Heading size={'md'} color="white">
                  Current Results
                </Heading>
              </Box>
              <Box
                border={'2px solid #ec407a'}
                borderBottomRadius={10}
                padding={10}
              >
                <Voting choices={choices} score={score} scores={scores} />
              </Box>
            </Box>
            {activeAccount && (
              <Box
                padding={5}
                marginBottom={5}
                cursor="pointer"
                minW={['100vw', '100vw', '100vw', '20px']}
                maxWidth={'100vw'}
              >
                <Box
                  background="brand.400"
                  padding={2}
                  display="flex"
                  borderTopLeftRadius={10}
                  borderTopRightRadius={10}
                  flexDirection="row"
                >
                  <Heading size={'md'} color="white">
                    I Voted POAP
                  </Heading>
                </Box>
                <Box
                  border={'2px solid #ec407a'}
                  borderBottomRadius={10}
                  padding={10}
                >
                  <ClaimPoap
                    address={activeAccount?.address as string}
                    proposalId={identifier as string}
                    snapshot={snapshot as string}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </GridItem>
      </Grid>
    </>
  );
}
