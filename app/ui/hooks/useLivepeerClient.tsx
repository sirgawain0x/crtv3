import { createReactClient, studioProvider } from '@livepeer/react';

export const useLivepeerClient = createReactClient({
  provider: studioProvider({ apiKey: process.env.LIVEPEER_API_KEY || '' }),
});
