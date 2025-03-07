import { OrbisDB } from '@useorbis/db-sdk';

if (!process.env.NEXT_PUBLIC_CERAMIC_NODE_URL) {
  throw new Error('NEXT_PUBLIC_CERAMIC_NODE_URL is not defined');
}

if (!process.env.NEXT_PUBLIC_ORBIS_NODE_URL) {
  throw new Error('NEXT_PUBLIC_ORBIS_NODE_URL is not defined');
}

if (!process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID) {
  throw new Error('NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID is not defined');
}

export const db = new OrbisDB({
  ceramic: {
    gateway: process.env.NEXT_PUBLIC_CERAMIC_NODE_URL,
  },
  nodes: [
    {
      gateway: process.env.NEXT_PUBLIC_ORBIS_NODE_URL,
      env: process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID,
    },
  ],
});
