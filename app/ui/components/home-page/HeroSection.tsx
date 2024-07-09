'use client';
import React from 'react';
import {
  Container,
  Stack,
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Icon,
  IconButton,
  IconProps,
  useColorModeValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import {
  HERO_VIDEO_TITLE,
  LIVEPEER_HERO_PLAYBACK_ID,
  HERO_NAME,
  HERO_DESCRIPTION,
  HERO_BUTTONS,
} from '../../../lib/utils/context';
import { getSrc } from "@livepeer/react/external";
import * as Player from "@livepeer/react/player";
import { PauseIcon, PlayIcon } from "@livepeer/react/assets";

export default function HeroSection() {
  const router = useRouter();
  return (
      <Container maxW={'7xl'}>
        <Stack
          align={'center'}
          spacing={{ base: 8, md: 10 }}
          py={{ base: 10, md: 18 }}
          direction={{ base: 'column', md: 'row' }}
        >
          <Stack flex={1} spacing={{ base: 5, md: 10 }}>
            <Heading
              lineHeight={1.1}
              fontWeight={600}
              fontSize={{ base: '3xl', sm: '4xl', lg: '6xl' }}
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
                  zIndex: -99,
                }}
              >
                {HERO_NAME.top}
              </Text>
              <br />
              <Text as={'span'} color={'#EE774D'}>
                {HERO_NAME.bottom}
              </Text>
            </Heading>
            <Text color={'gray.500'}>{HERO_DESCRIPTION}</Text>
            <Stack
              spacing={{ base: 4, sm: 6 }}
              direction={{ base: 'column', sm: 'row' }}
            >
              <Button
                rounded={'full'}
                size={'lg'}
                color={useColorModeValue('brand.100','white')}
                fontWeight={'normal'}
                px={6}
                colorScheme={'pink'}
                bg={'#FF4583'}
                _hover={{ bg: '#D93B6F' }}
                leftIcon={<PlayIcon />}
                onClick={() => router.push(HERO_BUTTONS.secondary.href)}
              >
                {HERO_BUTTONS.secondary.text}
              </Button>
            </Stack>
          </Stack>
          <Flex
            flex={1}
            justify={'center'}
            align={'center'}
            position={'relative'}
            width={'full'}
          >
            <Blob
              w={'120%'}
              h={'120%'}
              position={'absolute'}
              top={'8%'}
              left={0}
              zIndex={-9999}
              color={useColorModeValue('#FF4583', '#D93B6F')}
            />
            <Box
              position={'relative'}
              height={'auto'}
              rounded={'2xl'}
              boxShadow={'2xl'}
              width={'auto'}
              overflow={'hidden'}
              zIndex={-9}
            >
              <IconButton
                aria-label={'Play Button'}
                variant={'ghost'}
                _hover={{ bg: 'transparent' }}
                icon={<PlayIcon />}
                size={'lg'}
                color={'white'}
                position={'absolute'}
                left={'50%'}
                top={'50%'}
                transform={'translateX(-50%) translateY(-50%)'}
              />
              <Player.Root src={getSrc(LIVEPEER_HERO_PLAYBACK_ID)}>
                <Player.Container className="h-full w-full overflow-hidden bg-gray-950">
                  <Player.Video title={HERO_VIDEO_TITLE} className="h-full w-full" />
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
        </Stack>
      </Container>
  );
}

export const Blob = (props: IconProps) => {
  return (
    <Icon
      width={'100%'}
      viewBox="0 0 578 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M239.184 439.443c-55.13-5.419-110.241-21.365-151.074-58.767C42.307 338.722-7.478 282.729.938 221.217c8.433-61.644 78.896-91.048 126.871-130.712 34.337-28.388 70.198-51.348 112.004-66.78C282.34 8.024 325.382-3.369 370.518.904c54.019 5.115 112.774 10.886 150.881 49.482 39.916 40.427 49.421 100.753 53.385 157.402 4.13 59.015 11.255 128.44-30.444 170.44-41.383 41.683-111.6 19.106-169.213 30.663-46.68 9.364-88.56 35.21-135.943 30.551z"
        fill="currentColor"
      />
    </Icon>
  );
};
