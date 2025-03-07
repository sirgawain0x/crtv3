import { Livepeer } from '@livepeer/ai';

export const aiClient = new Livepeer({
  httpBearer: process.env.LIVEPEER_FULL_API_KEY || '',
});
