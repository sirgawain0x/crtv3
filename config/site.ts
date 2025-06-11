import { env } from '@/lib/env';

export const siteConfig = {
  name: 'CRTV3',
  description: 'A Web3 Creative Platform for Digital Artists and Collectors',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ogImage: '/og.jpg',
  creator: '@crtv3',
  keywords: ['Web3', 'Creative Platform', 'NFT', 'Digital Art', 'Blockchain'],
} as const;

export type SiteConfig = typeof siteConfig;
