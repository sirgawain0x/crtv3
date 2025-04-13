import { env } from '@/lib/env';

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  AUTH: {
    SIGN_IN: '/auth/sign-in',
    SIGN_UP: '/auth/sign-up',
    SIGN_OUT: '/auth/sign-out',
    RESET_PASSWORD: '/auth/reset-password',
  },
} as const;

export const API = {
  BASE_URL: env.NEXT_PUBLIC_APP_URL,
  ENDPOINTS: {
    AUTH: '/api/auth',
    USERS: '/api/users',
    PROJECTS: '/api/projects',
  },
} as const;

export const THIRDWEB = {
  AUTH_CONFIG: {
    domain: env.THIRDWEB_AUTH_DOMAIN,
    authUrl: '/api/auth',
  },
} as const;

export const STORAGE = {
  TOKEN_KEY: 'auth_token',
  THEME_KEY: 'theme',
  USER_SETTINGS: 'user_settings',
} as const;

export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Routes = typeof ROUTES;
export type Api = typeof API;
export type ThirdwebConfig = typeof THIRDWEB;
export type Storage = typeof STORAGE;
export type Theme = typeof THEME;
export type Breakpoints = typeof BREAKPOINTS;
