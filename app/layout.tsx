// crtv3/app/layout.tsx (1-38)
import { config } from '@app/config';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Layout from './components/Layout/Layout'; // Ensure this component accepts children
import { VideoProvider } from './context/VideoContext'; // Ensure this component accepts children
import { Toaster } from '@/components/ui/toaster';
import { validateEnv } from '@/lib/env';
import { AuthProvider } from '@/lib/context/auth-context';
import { AlchemyAccountProvider } from '@account-kit/react';
import { queryClient } from './config/query-client';

const inter = Inter({ subsets: ['latin'] });

// Validate environment variables at startup
validateEnv();

export const metadata: Metadata = {
  title: 'Creative TV',
  description: 'Creative TV - Web3 Video Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AlchemyAccountProvider config={config} queryClient={queryClient}>
          <AuthProvider>
            <Providers>
              <VideoProvider>
                <Layout>{children}</Layout>
                <Toaster />
              </VideoProvider>
            </Providers>
          </AuthProvider>
        </AlchemyAccountProvider>
      </body>
    </html>
  );
}
