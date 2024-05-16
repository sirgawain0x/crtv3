<<<<<<< Updated upstream
import { Livepeer } from 'livepeer';

export const livepeer = new Livepeer({
  apiKey: `Bearer ${process.env.LIVEPEER_API_KEY}`,
});
=======
import { LIVEPEER_API_KEY } from '@app/lib/utils/env';
import { LivepeerFetcher } from '@app/lib/utils/fetchers/livepeer-api';

export const livepeer = new LivepeerFetcher({ apiKey: `Bearer ${LIVEPEER_API_KEY}` });
>>>>>>> Stashed changes
