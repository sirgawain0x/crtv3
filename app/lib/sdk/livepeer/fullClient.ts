import { Livepeer } from 'livepeer';

export const fullLivepeer = new Livepeer({
  apiKey: process.env.NEXT_PUBLIC_LIVEPEER_FULL_API_KEY,
});
