import React from 'react'
import { useRouter } from 'next/router'
import { Metadata } from 'next'
import { BreadcrumbItem, BreadcrumbLink, Breadcrumb, Box, Heading, Flex, Text } from '@chakra-ui/react'
import { useActiveAccount } from 'thirdweb/react'
import AllAssets from '../../../components/AllAssets'

export const metadata: Metadata = {
    title: "Discover Creative TV",
}

export default function Discover() {
  const router = useRouter()
  const activeAccount = useActiveAccount()

  return (
    <>
      <Box p={4}>
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.push('/')}><span role="img" aria-label="home">🏠</span> Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage className="active-crumb">
            <BreadcrumbLink>Explore</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </Box>
      <Box>
      <Heading mb={10}>Explore Content</Heading>
      {!activeAccount ? (
        <Flex flexDirection="column" my={10} gap={5} maxW="md">
          <Text>Sign in to see uploaded content.</Text>
        </Flex>
      ):(
        <>
            <AllAssets />
        </>
      )}
      </Box>
    </>
  )
}