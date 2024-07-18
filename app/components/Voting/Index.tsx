'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  BreadcrumbItem,
  BreadcrumbLink,
  Breadcrumb,
  Box,
  Heading,
  Flex,
  Text,
  Container,
  Button,
  RadioGroup,
  Stack,
  Radio,
  filter,
} from '@chakra-ui/react';
import Link from 'next/link';
import { FaUsers, FaCertificate } from 'react-icons/fa';
import { useActiveAccount } from 'thirdweb/react';
import { ROLES, CREATIVE_ADDRESS } from '@app/lib/utils/context';
import { Card } from '@app/components/Voting/Card';
import { gql, useQuery } from '@apollo/client';

// GraphQL query to fetch proposals
const GET_PROPOSALS = gql`
  query {
    proposals(
      first: 50
      skip: 0
      where: { space_in: ["thecreative.eth"] }
      orderBy: "created"
      orderDirection: desc
    ) {
      id
      title
      body
      choices
      start
      end
      snapshot
      state
      scores
      scores_by_strategy
      scores_total
      scores_updated
      author
      type
      quorum
      space {
        id
        name
      }
    }
  }
`;

// Interface for proposal data
interface Proposal {
  id: string;
  title: string;
  body: string;
  start: number; // assuming timestamp
  end: number; // assuming timestamp
  snapshot: any; // specify more precise types if possible
  state: string;
  scores: any; // specify more precise types if possible
  scores_total: number;
  author: string;
  type: string;
  quorum: any; // specify more precise types if possible
  space: {
    id: string;
    name: string;
  };
  choices: any[]; // specify more precise types if possible
}

const Vote = () => {
  const activeAccount = useActiveAccount();
  const { loading, error, data } = useQuery(GET_PROPOSALS);
  const proposals: Proposal[] = useMemo(
    () => (data ? data.proposals : []),
    [data],
  );

  // Explicitly declare the type of state variable as Proposal[]
  const [snapshots, setSnapshots] = useState<Proposal[]>([]);

  const [selectionType, setSelectionType] = useState([false, false, true]);
  const [value, setValue] = useState('closed');

  const handleTypeChange = (id: number) => {
    setSelectionType(selectionType.map((_, index) => index === id));
  };

  const convertDate = (date: number) => new Date(date * 1000).toUTCString();

  useEffect(() => {
    const reset = () =>
      setSnapshots(proposals.filter((item) => item.state === value));
    const filterCore = () =>
      setSnapshots(
        proposals.filter(
          (item) => item.author === CREATIVE_ADDRESS && item.state === value,
        ),
      );
    const filterCommunity = () =>
      setSnapshots(
        proposals.filter(
          (item) => item.author !== CREATIVE_ADDRESS && item.state === value,
        ),
      );

    if (selectionType[0]) {
      filterCore();
    } else if (selectionType[1]) {
      filterCommunity();
    } else {
      reset();
    }
  }, [proposals, selectionType, value]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <>
      <Box my={5} p={4}>
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
            <BreadcrumbLink href="#">Vote</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </Box>
      <Box padding={20} p={4}>
        <Box>
          <Box>
            <Heading>Voting</Heading>
          </Box>
          <Box marginTop={5}>
            <Text>Have your say in the future of the Creative ecosystem.</Text>
          </Box>
          {activeAccount && (
            <Box marginTop={5}>
              <Link href={'/vote/create'}>
                <Button
                  padding={5}
                  backgroundColor={'#EC407A'}
                  _hover={{ bg: '#A62953' }}
                  _focus={{ bg: '#A62953' }}
                >
                  <Heading size="sm" color={'white'}>
                    Make a Proposal
                  </Heading>
                </Button>
              </Link>
            </Box>
          )}
        </Box>
        <Box paddingTop={10}>
          <Box>
            <Box>
              <Heading>Proposals</Heading>
            </Box>
            <Box
              display={'flex'}
              flexDir={'row'}
              minW={'40vw'}
              marginTop={5}
              padding={2}
              borderTopRadius={10}
              bgGradient="linear(to-l, #FFCC80, #D32F2F, #EC407A)"
            >
              <Box
                cursor={'pointer'}
                margin={2}
                display={'flex'}
                flexDir={'row'}
                justifyContent={'center'}
                alignItems={'center'}
                minW={10}
                padding={2}
                borderRadius={10}
                onClick={() => handleTypeChange(0)}
                background={selectionType[0] ? 'white' : 'brand.400'}
              >
                <FaCertificate color={selectionType[0] ? '#ec407a' : 'white'} />
                <Text
                  marginLeft={2}
                  color={selectionType[0] ? '#ec407a' : 'white'}
                >
                  Core
                </Text>
              </Box>
              <Box
                cursor={'pointer'}
                margin={2}
                display={'flex'}
                flexDir={'row'}
                justifyContent={'center'}
                alignItems={'center'}
                minW={10}
                padding={2}
                borderRadius={10}
                onClick={() => handleTypeChange(1)}
                background={selectionType[1] ? 'white' : '#ec407a'}
              >
                <FaUsers color={selectionType[1] ? '#ec407a' : 'white'} />
                <Text
                  marginLeft={2}
                  color={selectionType[1] ? '#ec407a' : 'white'}
                >
                  Community
                </Text>
              </Box>
              <Box
                cursor={'pointer'}
                margin={2}
                display={'flex'}
                flexDir={'row'}
                minW={10}
                padding={2}
                borderRadius={10}
                justifyContent={'center'}
                alignItems={'center'}
                onClick={() => handleTypeChange(2)}
                background={selectionType[2] ? 'white' : '#ec407a'}
              >
                <Text color={selectionType[2] ? '#ec407a' : 'white'}>All</Text>
              </Box>
            </Box>
            <Box
              display={'flex'}
              flexDir={'row'}
              minW={'40vw'}
              padding={2}
              background={'#1A202C'}
            >
              <RadioGroup onChange={setValue} value={value}>
                <Stack direction="row">
                  <Radio value="active" color="white">
                    <Text color="white">Vote Now</Text>
                  </Radio>
                  <Radio value="pending" color="white">
                    <Text color="white">Soon</Text>
                  </Radio>
                  <Radio value="closed" color="white">
                    <Text color="white">Closed</Text>
                  </Radio>
                </Stack>
              </RadioGroup>
            </Box>
            <Box
              border={'2px solid #ec407a'}
              padding={5}
              borderBottomRadius={25}
            >
              {snapshots.map((data) => {
                return (
                  <Card
                    core={data.author === CREATIVE_ADDRESS}
                    key={data.id}
                    title={data.title}
                    body={data.body}
                    state={data.state}
                    start={convertDate(data.start)}
                    choices={data.choices}
                    end={convertDate(data.end)}
                    score={data.scores_total}
                    scores={data.scores}
                    creator={data.author}
                    identifier={data.id}
                    snapshot={data.snapshot}
                  />
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};
export default Vote;
