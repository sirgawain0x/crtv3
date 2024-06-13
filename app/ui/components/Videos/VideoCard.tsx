'use client';
import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Text,
  Flex,
  Avatar,
  Box,
  Stack,
  HStack,
  Divider,
  Button,
  Badge,
  Spacer,
  ButtonGroup,
} from '@chakra-ui/react';
import PlayerCardComponent from '../Player/Player';
import { motion } from 'framer-motion';
import { SITE_LOGO } from '../../../lib/utils/context';
import { AssetData } from '@app/lib/types';
import Link from 'next/link';

type VideoCardProps = {
  assetData: AssetData;
};

const VideoCard: React.FC<VideoCardProps> = ({ assetData }) => {
  console.log('Video Card Asset Data:', assetData);
  return (
    <>
    <Card key={assetData?.id} minW={"sm"} maxW={'md'} variant={'elevated'} mb={12}>
      <CardHeader>
        <Flex flex={1} gap={4} align="center" flexWrap={'wrap'}>
          <Avatar name="creative" src={SITE_LOGO} />
          <Box>
            <Heading as={'h4'} size="sm">
              Creator
            </Heading>
            <Text>{assetData?.video?.creatorId.value}</Text>
          </Box>
        </Flex>
      </CardHeader>
      <PlayerCardComponent asset={assetData}/>
      <CardBody>
        <Flex>
          <Badge colorScheme={assetData?.video?.status?.phase === 'ready' ? 'green' : 'red'}>
            {assetData?.video?.status?.phase}
          </Badge>
          <Spacer />
          <Text>Views: {assetData?.views?.viewCount}</Text>
        </Flex>
        <Stack mt="6" spacing="3">
          <HStack>
            <Heading as={'h1'} size={'lg'}>
              {assetData?.name}
            </Heading>
            <Spacer />
            <Text color={'brand.300'} fontSize={'xl'}>
              <span style={{ fontSize: 'sm' }}>{assetData?.currency || 'USDC'}</span>
            </Text>
          </HStack>
          <Text>
            {assetData?.description ||
              'With Creative TV, we wanted to sync the speed of creation with the speed of design. We wanted the creator to be just as excited as the designer to create new content.'}
          </Text>
        </Stack>
      </CardBody>
      <Divider />
      <CardFooter justify="space-between" flexWrap="wrap">
        {assetData?.video.status?.phase === 'ready' ? (
          <ButtonGroup mb={5} spacing={10}>
            <Link href={`discover/${encodeURIComponent(assetData?.id)}`} passHref>
              <Button
                as={motion.div}
                _hover={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                flex="1"
                variant="ghost"
                aria-label={`Comment on ${assetData?.name}`}
              >
                Details
              </Button>
            </Link>
            <Button
              as={motion.div}
              _hover={{ transform: 'scale(1.1)', cursor: 'pointer' }}
              flex="1"
              variant="ghost"
              aria-label="Share this video"
            >
              Share
            </Button>
          </ButtonGroup>
        ) : (
          <>{''}</>
        )}
      </CardFooter>
    </Card>
  </>
  );
};

export default VideoCard;
