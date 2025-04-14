'use client';
import { ApolloWrapper } from './lib/utils/ApolloWrapper';
import { createContext, useContext, useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { OrbisProvider } from '@app/lib/sdk/orbisDB/context';
import { SubtitlesProvider } from './components/Player/Subtitles';
import { ThemeProvider } from 'next-themes';
import { AlchemyClientState } from '@account-kit/core';
import { AlchemyAccountProvider } from '@account-kit/react';
import { config as accountKitConfig, queryClient } from './config/account-kit';
import { config as wagmiConfig } from './config/wagmi';
import { WagmiProvider } from 'wagmi';
import { PropsWithChildren } from 'react';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ProvidersProps extends PropsWithChildren {
  initialState?: AlchemyClientState;
}

export function Providers({ children, initialState }: ProvidersProps) {
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
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          <AlchemyAccountProvider
            config={accountKitConfig}
            queryClient={queryClient}
            initialState={initialState}
          >
            <WagmiProvider config={wagmiConfig}>
              <SubtitlesProvider>
                <ApolloWrapper>
                  <OrbisProvider>{children}</OrbisProvider>
                </ApolloWrapper>
              </SubtitlesProvider>
            </WagmiProvider>
          </AlchemyAccountProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
