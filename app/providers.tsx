'use client';
import React, {useState} from 'react';
import { ChakraProvider, extendTheme, withDefaultColorScheme } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloWrapper } from './lib/utils/ApolloWrapper';
import { ThirdwebProvider } from '@app/lib/sdk/thirdweb/components';

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

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000 * 5,
          },
        },
      })
  );

  return (
    <ChakraProvider theme={customTheme}>
      
        <QueryClientProvider client={queryClient}>
          <ApolloWrapper>
            <ThirdwebProvider>
              {children}
            </ThirdwebProvider>
          </ApolloWrapper>
        </QueryClientProvider>
    </ChakraProvider>
  );
}
