'use client';
import { ApolloWrapper } from './lib/utils/ApolloWrapper';
import { createContext, useContext, useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { OrbisProvider } from '@app/lib/sdk/orbisDB/context';
import { SubtitlesProvider } from './components/Player/Subtitles';
import { ThemeProvider } from 'next-themes';
import { AlchemyClientState } from '@account-kit/core';
import { AlchemyAccountProvider } from '@account-kit/react';
import { config } from './config';
import { queryClient } from './config/query-client';
import { PropsWithChildren } from 'react';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function Providers({ children }: PropsWithChildren) {
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
        <SubtitlesProvider>
          <ApolloWrapper>
            <QueryClientProvider client={queryClient}>
              <OrbisProvider>{children}</OrbisProvider>
            </QueryClientProvider>
          </ApolloWrapper>
        </SubtitlesProvider>
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
