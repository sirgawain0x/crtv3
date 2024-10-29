import { OrbisDB } from '@useorbis/db-sdk';

export const db = new OrbisDB({
  ceramic: {
    gateway: process.env.CERAMIC_NODE_URL || 'https://ceramic-orbisdb-mainnet-direct.hirenodes.io/',
  },
  nodes: [
    {
      gateway: process.env.ORBIS_NODE_URL || 'https://studio.useorbis.com',
      env: `${process.env.ORBIS_ENVIRONMENT_ID}`,
    },
  ],
});
