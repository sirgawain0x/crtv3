import { OrbisDB } from '@useorbis/db-sdk';

export const db = new OrbisDB({
  ceramic: {
    gateway: process.env.NEXT_PUBLIC_CERAMIC_GATEWAY as string,
  },
  nodes: [
    {
      gateway: process.env.NEXT_PUBLIC_ORBIS_NODE_URL as string,
      env: process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID as string,
    },
  ],
});
