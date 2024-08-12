'use client';
import { ApolloWrapper } from './lib/utils/ApolloWrapper';
import { ThirdwebProvider } from '@app/lib/sdk/thirdweb/components';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

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
        <ThirdwebProvider>{children}</ThirdwebProvider>
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
