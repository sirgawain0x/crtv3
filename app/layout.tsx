import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Layout from './ui/components/Layout/Layout';


const inter = Inter({ subsets: ['latin'] });

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
              <Layout>{children}</Layout>
            </Providers>
      </body>
    </html>
  );
}
