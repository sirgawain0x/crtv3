import { OrbisDB } from '@useorbis/db-sdk';

export const db = new OrbisDB({
  ceramic: {
    gateway: `${process.env.CERAMIC_NODE_URL}`,
  },
  nodes: [
    {
      gateway: `${process.env.ORBIS_NODE_URL}`,
      env: `${process.env.ORBIS_ENVIRONMENT_ID}`,
    },
  ],
});
