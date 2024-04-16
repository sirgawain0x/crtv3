import React from 'react'
import { BreadcrumbItem, BreadcrumbLink, Breadcrumb, Box, Heading, Flex, Text } from '@chakra-ui/react'
import Link from 'next/link'

export default async function AllVideosPage() {

  return (
    <main>
      <Box p={4}>
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href='/'><span role="img" aria-label="home">🏠</span> Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage className="active-crumb">
            <BreadcrumbLink isCurrentPage>Explore</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </Box>
      <Box>
      <Heading mb={10}>Explore Content</Heading>
        <Flex flexDirection="column" my={10} gap={5} maxW="md">
          <Text>This is the Discover Page.</Text>
          <Box>
            <Link href="/videos/video-1">Video 1</Link>
          </Box>
          <Box>
            <Link href="/videos/video-2">Video 2</Link>
          </Box>
        </Flex>
      </Box>
    </main>
  )
}