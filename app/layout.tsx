import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Layout from './components/Layout/Layout';
import { VideoProvider } from './context/VideoContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'Creative TV',
  description: 'The way content should be',
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
          </VideoProvider>
        </Providers>
      </body>
    </html>
  );
}
