import { Livepeer } from 'livepeer';

export const fullLivepeer = new Livepeer({
  apiKey: process.env.LIVEPEER_API_KEY,
});
