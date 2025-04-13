// crtv3/app/layout.tsx (1-38)
import { config } from '@/config';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { Providers } from './providers';
import Layout from './components/Layout/Layout'; // Ensure this component accepts children
import { VideoProvider } from './context/VideoContext'; // Ensure this component accepts children
import { Toaster } from '@app/components/ui/toaster';
import { validateEnv } from '@/lib/env';

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
        <Providers>
          <VideoProvider>
            <Layout>{children}</Layout>
            <Toaster />
          </VideoProvider>
        </Providers>
      </body>
    </html>
  );
}
