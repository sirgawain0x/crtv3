import { Livepeer } from 'livepeer';

export const livepeer = new Livepeer({
  apiKey: process.env.LIVEPEER_API_KEY,
});
