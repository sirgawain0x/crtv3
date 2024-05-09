import { Livepeer } from 'livepeer';

export const livepeer = new Livepeer({
  apiKey: `Bearer ${process.env.LIVEPEER_API_KEY}`,
});
