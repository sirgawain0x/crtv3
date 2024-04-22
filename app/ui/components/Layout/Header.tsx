'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Center,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  Heading,
  IconButton,
  Image,
  Link,
  LinkBox,
  LinkOverlay,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SimpleGrid,
  Stack,
  Text,
  chakra,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { useScroll } from 'framer-motion';
import { AiOutlineMenu } from 'react-icons/ai';
import { IoIosArrowDown } from 'react-icons/io';
import ConnectButtonWrapper from '../Button/connectButtonWrapper';
import { SITE_LOGO, SITE_NAME } from '../../../lib/utils/context';
import { ThemeSwitcher } from './ThemeSwitcher';

interface Props {
  className?: string;
  icon?: string;
  title?: string;
  children?: React.ReactNode;
  handleLoading?: () => void;
}

export default function Header({ className, handleLoading }: Props) {
  const styleName = className ?? '';
  const ref = useRef(null);
  const router = useRouter();

  const [y, setY] = useState(0);
  const { scrollY } = useScroll();
  const mobileNav = useDisclosure();
  const cbg = useColorModeValue('#F0F0F0', 'brand.100');
  const cl = useColorModeValue('gray.900', 'white');

  useEffect(() => {
    function updateScrollY() {
      setY(scrollY.get());
    }
    const unsubscribeY = scrollY.on('change', updateScrollY);
    return unsubscribeY;
  }, [scrollY]);

  const { height } = ref.current ? ref.current : { height: 0 };

  const Section = ({ icon, title, children }: Props) => {
    const ic = useColorModeValue('brand.600', 'brand.300');
    const hbg = useColorModeValue('gray.100', 'brand.100');
    const tcl = useColorModeValue('gray.900', 'brand.400');
    const dcl = useColorModeValue('gray.500', 'gray.100');
    return (
      <Box
        display="flex"
        alignItems="start"
        rounded="lg"
        _hover={{ bg: hbg, cursor: 'pointer' }}
      >
        <chakra.svg
          flexShrink={0}
          h={6}
          w={6}
          color={ic}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          {icon}
        </chakra.svg>
        <Box pl={4}>
          <Text size="sm" fontWeight="700" color={tcl}>
            {title}
          </Text>
          <chakra.div mt={1} fontSize="sm" color={dcl}>
            {children}
          </chakra.div>
        </Box>
      </Box>
    );
  };

  const Features = (props: any) => {
    const hbg = useColorModeValue('gray.100', 'brand.100');
    const hbgh = useColorModeValue('brand.400', 'brand.300');
    const tcl = useColorModeValue('brand.100', 'brand.600');
    return (
      <>
        <SimpleGrid
          columns={props.h ? { base: 1, md: 3, lg: 5 } : 1}
          pos="relative"
          gap={{ base: 6, sm: 8 }}
          px={5}
          py={6}
          p={{ sm: 8 }}
        >
          <LinkBox color={tcl}>
            <Section title="How It Works">
              <LinkOverlay
                href="https://creativeplatform.xyz/docs/intro"
                target={'_blank'}
              >
                <Text>Documentation on how the Creative platform works</Text>
              </LinkOverlay>
            </Section>
          </LinkBox>
          <LinkBox color={tcl}>
            <Section title="CREATIVE Terminal">
              <LinkOverlay href="https://app.creativeplatform.xyz">
                <Text>
                  A retro terminal GUI with future ChatGPT integration, offering
                  a unique, type-driven interface to explore and engage with the
                  Creative Ecosystem seamlessly.
                </Text>
              </LinkOverlay>
            </Section>
          </LinkBox>
          <LinkBox color={tcl}>
            <Section title="CREATIVE Dashboard">
              <LinkOverlay
                href="https://app.charmverse.io/creative-like-brown-fowl/"
                target={'_blank'}
              >
                <Text>
                  This dashboard serves as a members-only central hub for
                  innovation, collaboration, and growth.{' '}
                </Text>
              </LinkOverlay>
            </Section>
          </LinkBox>

          <LinkBox color={tcl}>
            <Section title="Dear Creative">
              <LinkOverlay
                href="https://news.creativeplatform.xyz"
                target={'_blank'}
              >
                <Text>
                  A vibrant newsletter delivering the latest in blockchain and
                  entertainment innovation, tailored for creatives seeking to
                  inspire and be inspired.
                </Text>
              </LinkOverlay>
            </Section>
          </LinkBox>

          <LinkBox color={tcl}>
            <Section title="Bugs/Feature Suggestions">
              <LinkOverlay
                href="https://feedback.creativeplatform.xyz"
                target={'_blank'}
              >
                <Text>
                  Suggest a feature to the Creative community for the good of
                  the platform.
                </Text>
              </LinkOverlay>
            </Section>
          </LinkBox>
        </SimpleGrid>
        <Box px={{ base: 5, sm: 8 }} py={5} bg={hbg} display={{ sm: 'flex' }}>
          <Stack direction={{ base: 'row' }} spacing={{ base: 6, sm: 10 }}>
            <Box display="flow-root">
              <LinkBox
                m={-3}
                p={3}
                display="flex"
                alignItems="center"
                rounded="md"
                fontSize="md"
                color={tcl}
                _hover={{ bg: hbgh }}
              >
                <chakra.svg
                  flexShrink={0}
                  h={6}
                  w={6}
                  color="inherit"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </chakra.svg>
                <LinkOverlay
                  href="https://app.clarity.so/creativeOrg/docs/d259949c-fc14-484c-a53f-f6e80ce0ce04"
                  target={'_blank'}
                >
                  <chakra.span ml={3}>Watch Demo</chakra.span>
                </LinkOverlay>
              </LinkBox>
            </Box>

            <Box display="flow-root">
              <LinkBox
                m={-3}
                p={3}
                display="flex"
                alignItems="center"
                rounded="md"
                fontSize="md"
                color={tcl}
                _hover={{ bg: hbgh }}
              >
                <chakra.svg
                  flexShrink={0}
                  h={6}
                  w={6}
                  color="inherit"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </chakra.svg>
                <LinkOverlay
                  href="mailto:sales@creativeplatform.xyz"
                  target={'_blank'}
                >
                  <chakra.span ml={3}>Contact Sales</chakra.span>
                </LinkOverlay>
              </LinkBox>
            </Box>
          </Stack>
        </Box>
      </>
    );
  };

  const MobileNavContent = (props: any) => {
    return (
      <Drawer
        isOpen={mobileNav.isOpen}
        placement="top"
        onClose={mobileNav.onClose}
        size={{ base: 'full', sm: 'full', md: 'xs' }}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody>
            <p>
              <Accordion allowToggle my={4}>
                <AccordionItem>
                  <AccordionButton>
                    <Button
                      color="black.700"
                      display="inline-flex"
                      alignItems="center"
                      px={0}
                      fontSize="sm"
                      fontWeight={700}
                      _hover={{ color: cl }}
                      _focus={{ boxShadow: 'none' }}
                    >
                      Free Channels
                    </Button>
                    <AccordionIcon
                      display={{ base: 'none', sm: 'none', md: 'block' }}
                    />
                  </AccordionButton>
                  <AccordionPanel>
                    <LinkBox
                      as="article"
                      maxW="sm"
                      p="4"
                      borderWidth="1px"
                      rounded="md"
                    >
                      <Box as="time" dateTime="2023-11-09 15:30:00 +0000 UTC">
                        Exclusive
                      </Box>
                      <Heading size="md" my="2">
                        <LinkOverlay as={NextLink} href="#">
                          New Year, New Beginnings: Creative Kidz
                        </LinkOverlay>
                      </Heading>
                      <Text>
                        Catch up on what&apos;s been cookin&apos; at CREATIVE
                        Kidz, equiping underserved kids with digital art tools
                        via Nouns NFT auctions and T-Mobile.
                      </Text>
                    </LinkBox>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </p>
            <chakra.p paddingLeft={15.9}>
              <Link
                as={NextLink}
                href="/discover"
                display="inline-flex"
                alignItems="center"
                fontSize="14px"
                px="0"
                my={4}
                fontWeight={700}
                _hover={{ color: cl }}
              >
                Discover
              </Link>
            </chakra.p>
            <chakra.p paddingLeft={15.9}>
              <Link
                as={NextLink}
                href="/vote"
                display="inline-flex"
                alignItems="center"
                fontSize="14px"
                px="0"
                my={4}
                fontWeight={700}
                _hover={{ color: cl }}
              >
                Vote
              </Link>
            </chakra.p>
            <p>
              <Accordion allowToggle my={4}>
                <AccordionItem>
                  <AccordionButton>
                    <Button
                      display="inline-flex"
                      alignItems="center"
                      fontSize="14px"
                      px="0"
                      fontWeight={700}
                      _hover={{ color: cl }}
                      _focus={{ boxShadow: 'none' }}
                    >
                      Community
                      <AccordionIcon
                        display={{ base: 'none', sm: 'none', md: 'block' }}
                      />
                    </Button>
                  </AccordionButton>
                  <AccordionPanel>
                    <Features />
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </p>
            <chakra.p my={4}>
              <ConnectButtonWrapper />
            </chakra.p>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  };

  return (
    <chakra.header
      className={styleName}
      ref={ref}
      shadow={y > height ? 'sm' : undefined}
      transition="box-shadow 0.2s"
      bg={cbg}
      borderBottom="6px solid"
      borderBottomColor="brand.400"
      w="full"
      overflow="hidden"
    >
      <chakra.div h="84px" mx="auto" maxW="1770px" px="0.89rem">
        <Flex
          minWidth="max-content"
          h="full"
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex align="flex-start">
            <HStack p={2}>
              <Box
                bg={cbg}
                px="0px"
                color="black.900"
                display="inline-flex"
                alignItems="center"
                fontSize={{ base: '0.85rem', sm: '0.9rem', md: '16px' }}
              >
                <Image
                  src={SITE_LOGO}
                  alt="Creative Logo"
                  boxSize={'4rem'}
                  objectFit="contain"
                />
                <Heading
                  color={useColorModeValue('black.900', 'white')}
                  as="h1"
                  size="16px"
                  fontWeight={900}
                  gap={5}
                >
                  {SITE_NAME}
                </Heading>
              </Box>
            </HStack>
          </Flex>
          <Flex>
            <HStack
              spacing="1"
              gap={10}
              display={{ base: 'none', md: 'none', lg: 'flex' }}
            >
              <Popover>
                <PopoverTrigger>
                  <Button
                    color="black.700"
                    display="inline-flex"
                    alignItems="center"
                    px="0"
                    fontSize="14px"
                    fontWeight={700}
                    _hover={{ color: cl }}
                    _focus={{ boxShadow: 'none' }}
                    rightIcon={<IoIosArrowDown />}
                  >
                    Free Channels
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  w="18vw"
                  maxW="md"
                  _focus={{ boxShadow: 'md' }}
                  className="content-items"
                >
                  <LinkBox
                    as="article"
                    maxW="sm"
                    p="4"
                    borderWidth="1px"
                    rounded="md"
                  >
                    <Box as="time" dateTime="2023-11-09 15:30:00 +0000 UTC">
                      Exclusive
                    </Box>
                    <Heading size="md" my="2">
                      <LinkOverlay
                        as={NextLink}
                        href="https://kidz.creativeplatform.xyz"
                        target="_blank"
                      >
                        New Year, New Beginnings: Creative Kidz
                      </LinkOverlay>
                    </Heading>
                    <Text>
                      Catch up on what&apos;s been cookin&apos; at CREATIVE
                      Kidz, equiping underserved kids with digital art tools via
                      Nouns NFT auctions and T-Mobile.
                    </Text>
                  </LinkBox>
                </PopoverContent>
              </Popover>
              <chakra.div>
                <Link
                  as={NextLink}
                  href="/discover"
                  display="inline-flex"
                  alignItems="center"
                  fontSize="14px"
                  px="0"
                  my={4}
                  fontWeight={700}
                  _hover={{ color: cl }}
                >
                  Discover
                </Link>
              </chakra.div>
              <chakra.div>
                <Link
                  as={NextLink}
                  href="/vote"
                  display="inline-flex"
                  alignItems="center"
                  fontSize="14px"
                  px="0"
                  my={4}
                  fontWeight={700}
                  _hover={{ color: cl }}
                >
                  Vote
                </Link>
              </chakra.div>
              <Center height="50px">
                <Divider orientation="vertical" />
              </Center>
              <Popover>
                <PopoverTrigger>
                  <Button
                    display="inline-flex"
                    alignItems="center"
                    fontSize="14px"
                    px="0"
                    fontWeight={700}
                    _hover={{ color: cl }}
                    _focus={{ boxShadow: 'none' }}
                    rightIcon={<IoIosArrowDown />}
                  >
                    Community
                  </Button>
                </PopoverTrigger>
                <PopoverContent w="22vw" maxW="md" _focus={{ boxShadow: 'md' }}>
                  <Features />
                </PopoverContent>
              </Popover>
              <Center height="50px">
                <Divider orientation="vertical" />
              </Center>
              <ThemeSwitcher />
            </HStack>
          </Flex>
          <chakra.div display={{ base: 'none', md: 'none', lg: 'block' }}>
            <ConnectButtonWrapper />
          </chakra.div>
          <Flex gap="1.2rem" display={{ base: 'flex', md: 'flex', lg: 'none' }}>
            <Center>
              <ThemeSwitcher />
            </Center>
            <IconButton
              variant="outline"
              aria-label="Open menu"
              fontSize="20px"
              colorScheme="white"
              icon={<AiOutlineMenu />}
              onClick={mobileNav.onOpen}
            />
          </Flex>
        </Flex>
        {<MobileNavContent />}
      </chakra.div>
    </chakra.header>
  );
}
