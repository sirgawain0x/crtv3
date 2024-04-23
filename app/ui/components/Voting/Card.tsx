'use client';
import React from 'react';
import { Box, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FaArrowRight,
  FaBan,
  FaClock,
  FaUsers,
  FaCertificate,
} from 'react-icons/fa';
import More from '@app/ui/components/Voting/More/More';
import Link from 'next/link';

export const Card = ({
  title,
  state,
  body,
  start,
  end,
  choices,
  creator,
  identifier,
  snapshot,
  score,
  scores,
  core,
}: {
  title: string;
  state: string;
  body?: string;
  start?: string;
  end?: string;
  choices?: any[];
  creator?: any;
  identifier?: any;
  snapshot?: any;
  score?: number;
  scores?: any;
  core: boolean;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read a parameter
  const query = {
    'title': title,
    'end': end,
    'start': start, 
    'body': body,
    'choices': choices,
    'creator': creator,
    'identifier': identifier,
    'snapshot': snapshot,
    'scores': scores,
    'score': score
  };

  const goTo = (id: any) => {
    let url = `https://polygonscan.com/block/${id}`;
    window.open(url, '_blank');
  };

  return (
    <Link href={`/vote/more?title=${encodeURIComponent(title)}&end=${end}&start=${start}&body=${body}&choices=${encodeURIComponent(JSON.stringify(choices))}&creator=${encodeURIComponent(creator)}&identifier=${encodeURIComponent(identifier)}&snapshot=${encodeURIComponent(snapshot)}&scores=${encodeURIComponent(scores)}&score=${score}`}>
    <Box
      cursor={'pointer'}
      padding={5}
      borderTop="1px solid #EC407A"
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
    >
      <Box>
        <Box marginBottom={5}>
          <Heading size="md">{title}</Heading>
        </Box>
        <Box>
          <Heading size="sm">
            {state === 'closed'
              ? `Ended: ${end}`
              : state === 'pending'
                ? `Opens: ${start}`
                : state === 'active'
                  ? `Ends: ${end}`
                  : null}
          </Heading>
        </Box>
        <Box display="flex">
          <Box
            minW={'30'}
            maxW={'40'}
            padding={2}
            margin={2}
            display={'flex'}
            alignItems={'center'}
            justifyContent={'center'}
            borderRadius={'20'}
          >
            {state === 'closed' ? (
              <FaBan color={'red'} />
            ) : state === 'pending' ? (
              <FaClock color={'yellow'} />
            ) : state === 'active' ? (
              <FaClock color={'green'} />
            ) : null}
            <Text marginLeft={1}>{state}</Text>
          </Box>
          <Box
            minW={'20'}
            maxW={'40'}
            padding={2}
            margin={2}
            display={'flex'}
            border={core ? '4px solid #ec407a' : '4px solid #EE774D'}
            alignItems={'center'}
            justifyContent={'center'}
            borderRadius={'20'}
            background={useColorModeValue('gray.100', 'gray.800')}
          >
            {core ? (
              <FaCertificate color={core ? '#ec407a' : '#EE774D'} />
            ) : (
              <FaUsers color={core ? '#ec407a' : '#EE774D'} />
            )}
            <Text marginLeft={1} color={core ? '#ec407a' : '#EE774D'}>
              {core ? 'core' : 'community'}
            </Text>
          </Box>
        </Box>
      </Box>
      <Box>
        <Text>{''}</Text>
      </Box>
      <Box>
        <FaArrowRight />
      </Box>
    </Box>
    </Link>
  );
};
