'use client'
import { CollabLandClient } from '@collabland/sdk';

// eslint-disable-next-line import/no-mutable-exports
let collabLandClient: CollabLandClient = new CollabLandClient(
  {},
  process.env.NEXT_PUBLIC_COLLAB_LAND_SERVER_URL || '',
);

export const connectToSDK = async (): Promise<void> => {
  try {
    const client = new CollabLandClient(
      {
        apiKey: process.env.COLLAB_LAND_API_KEY,
        // authenticatedEncryption: `AE ${token}`,
      },
      process.env.NEXT_PUBLIC_COLLAB_LAND_SERVER_URL || '',
    );

    await client.connect();
    collabLandClient = client;
  } catch (e) {
    console.log('connection clint error: ', e);
  }
};

export const getCollabClient = (): CollabLandClient => collabLandClient;

export default collabLandClient;