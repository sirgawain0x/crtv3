'use client';
import { ApolloWrapper } from './lib/utils/ApolloWrapper';
import { ThirdwebProvider } from '@app/lib/sdk/thirdweb/components';
import { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrbisProvider } from '@app/lib/sdk/orbisDB/context';
import {
  defineChain,
  polygon,
  optimism,
  base,
  zora,
  zoraSepolia,
} from 'thirdweb/chains';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const queryClient = new QueryClient();

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const Providers: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const root = window.document.documentElement;
    const initialTheme = root.classList.contains('dark') ? 'dark' : 'light';
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('dark');
      setTheme('dark');
    } else {
      root.classList.remove('dark');
      setTheme('light');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ApolloWrapper>
        <ThirdwebProvider
          activeChain={base}
          desiredChainId={base} 
          supportedChains={[
            base,
          ]} 
          clientId={process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID}
        >
          <QueryClientProvider client={queryClient}>
            <OrbisProvider>
              {children}
            </OrbisProvider>
          </QueryClientProvider>
        </ThirdwebProvider>
      </ApolloWrapper>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
