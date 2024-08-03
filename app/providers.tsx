'use client';
import { ApolloWrapper } from './lib/utils/ApolloWrapper';
import { ThirdwebProvider } from '@app/lib/sdk/thirdweb/components';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloWrapper>
      <ThirdwebProvider>{children}</ThirdwebProvider>
    </ApolloWrapper>
  );
}
