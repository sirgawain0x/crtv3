'use client';
import React, { ReactNode } from 'react';
import { ChakraProvider as ChakraUiProvider, extendTheme, withDefaultColorScheme } from '@chakra-ui/react';
import { StyleConfig } from "@chakra-ui/theme-tools";
import { ApolloWrapper } from './lib/utils/ApolloWrapper';
import { ThirdwebProvider } from '@app/lib/sdk/thirdweb/components';

interface Props {
  children: ReactNode
}


const components: Record<string, StyleConfig> = {
  Link: {
    baseStyle: {
      color: "brand.500",
      textDecoration: "none",
    },
  },
  CustomBadge: {
    baseStyle: ({ colorMode }) => ({
      bg: colorMode === "dark" ? "brand.400" : "brand.300",
      color: colorMode === "dark" ? "gray.800" : "white",
      textTransform: "uppercase",
      fontWeight: "semibold",
      letterSpacing: "0.02em",
      padding: "4px",
      borderRadius: "2px",
      fontSize: "12px"
    }),
    variants: {
      custom: ({ colorMode }) => ({
        bg: colorMode === "dark" ? "dark" : "light",
        padding: "8px"
      })
    }
  },
}

const customTheme = extendTheme(withDefaultColorScheme({ 
  colorScheme: 'light', 
  components: [components],
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

export function ChakraProvider(props: Props) {
  return <ChakraUiProvider theme={customTheme}>{props.children}</ChakraUiProvider>
}

export function Providers({ children } : { children: React.ReactNode }) {

  return (
    <ChakraProvider>
          <ApolloWrapper>
            <ThirdwebProvider>
              {children}
            </ThirdwebProvider>
          </ApolloWrapper>
    </ChakraProvider>
  );
}
