import { Livepeer } from '@livepeer/ai';

const aiClient = new Livepeer({
    httpBearer: process.env.LIVEPEER_FULL_API_KEY || '',
});

export default aiClient;