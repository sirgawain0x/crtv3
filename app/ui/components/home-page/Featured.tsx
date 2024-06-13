'use client';
import React from 'react';
import {
  Container,
  Stack,
  Flex,
  Box,
  Heading,
  Text,
} from '@chakra-ui/react';
import { getSrc } from "@livepeer/react/external";
import * as Player from "@livepeer/react/player";
import { PauseIcon, PlayIcon } from "@livepeer/react/assets";
import {
  LIVEPEER_FEATURED_PLAYBACK_ID,
  FEATURED_VIDEO_TITLE,
  FEATURED_TEXT,
} from '../../../lib/utils/context';

export default function FeaturedVideo() {
  return (
      <Container maxW={'7xl'}>
        <Stack
          align={'center'}
          spacing={{ base: 8, md: 10 }}
          py={{ base: 20, md: 18 }}
          direction={{ base: 'column', md: 'row' }}
        >
          <Flex
            flex={1}
            justify={'left'}
            align={'center'}
            position={'relative'}
            w={'full'}
          >
            <Box
              position={'relative'}
              height={'auto'}
              rounded={'xl'}
              boxShadow={'xl'}
              width={'auto'}
              overflow={'hidden'}
            >
              <Player.Root src={getSrc(LIVEPEER_FEATURED_PLAYBACK_ID)}>
                <Player.Container className="h-full w-full overflow-hidden bg-gray-950">
                  <Player.Video title={FEATURED_VIDEO_TITLE} className="h-full w-full" />
                  <Player.Controls className="flex items-center justify-center">
                    <Player.PlayPauseTrigger className="w-10 h-10 hover:scale-105 flex-shrink-0">
                      <Player.PlayingIndicator asChild matcher={false}>
                        <PlayIcon className="w-full h-full" />
                      </Player.PlayingIndicator>
                      <Player.PlayingIndicator asChild>
                        <PauseIcon className="w-full h-full" />
                      </Player.PlayingIndicator>
                    </Player.PlayPauseTrigger>
                  </Player.Controls>
                </Player.Container>
              </Player.Root>
            </Box>
          </Flex>
          <Stack flex={1} spacing={{ base: 5, md: 10 }}>
            <Heading
              lineHeight={1.5}
              fontWeight={600}
              fontSize={{ base: '3xl', sm: '3xl', lg: '4xl' }}
              zIndex={-1}
            >
              <Text
                as={'span'}
                position={'relative'}
                _after={{
                  content: "''",
                  width: 'full',
                  height: '30%',
                  position: 'absolute',
                  bottom: 1,
                  left: 0,
                  bg: '#EE774D',
                  zIndex: -1,
                }}
              >
                {FEATURED_TEXT.top}
              </Text>
              <br />
              <Text as={'span'} color={'#EE774D'}>
                {FEATURED_TEXT.middle}
              </Text>
              <br />
              <Text as={'span'} color={'#EE774D'}>
                {FEATURED_TEXT.bottom}
              </Text>
            </Heading>
          </Stack>
        </Stack>
      </Container>
  );
}
