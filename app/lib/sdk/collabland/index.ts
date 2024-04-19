'use client'
import { CollabLandClient } from '@collabland/sdk';

// eslint-disable-next-line import/no-mutable-exports
let collabLandClient: CollabLandClient = new CollabLandClient(
  {},
  process.env.REACT_APP_API_SERVER_URL,
);

export const connectToSDK = async (): Promise<void> => {
  try {
    const client = new CollabLandClient(
      {
        apiKey: process.env.REACT_APP_COLLABLAND_KEY,
        // authenticatedEncryption: `AE ${token}`,
      },
      process.env.REACT_APP_API_SERVER_URL,
    );

    await client.connect();
    collabLandClient = client;
  } catch (e) {
    console.log('connection clint error: ', e);
  }
};

export const getCollabClient = (): CollabLandClient => collabLandClient;

export default collabLandClient;