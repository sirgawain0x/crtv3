'use client';
import React, {useState} from 'react';
import { ChakraProvider, extendTheme, withDefaultColorScheme } from '@chakra-ui/react';
import { ApolloWrapper } from './lib/utils/ApolloWrapper';
import { ThirdwebProvider } from '@app/lib/sdk/thirdweb/components';
import { LivepeerConfig } from "@livepeer/react"
import { useLivepeerClient } from '@app/ui/hooks/useLivepeerClient';
import { AppProps } from 'next/app';

const customTheme = extendTheme(withDefaultColorScheme({ 
  colorScheme: 'red', 
  components: ['Badge'],
}),{
  colors: {
    brand: {
      100: '#1A202C',
      200: '#161D2F',
      300: '#EC407A',
      400: '#FACB80',
      500: '#EE774D',
    },
  },
});



export function Providers({ children } : { children: React.ReactNode }) {

  return (
    <ChakraProvider theme={customTheme}>
      <LivepeerConfig dehydratedState={''} client={useLivepeerClient}>
          <ApolloWrapper>
            <ThirdwebProvider>
              {children}
            </ThirdwebProvider>
          </ApolloWrapper>
        </LivepeerConfig>
    </ChakraProvider>
  );
}
