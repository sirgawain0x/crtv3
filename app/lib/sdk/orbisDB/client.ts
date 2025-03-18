import { OrbisDB } from '@useorbis/db-sdk';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { catchError } from '@useorbis/db-sdk/util';
import type { OrbisConnectResult } from '@useorbis/db-sdk';

if (!process.env.NEXT_PUBLIC_CERAMIC_NODE_URL) {
  throw new Error('NEXT_PUBLIC_CERAMIC_NODE_URL is not defined');
}

if (!process.env.NEXT_PUBLIC_ORBIS_NODE_URL) {
  throw new Error('NEXT_PUBLIC_ORBIS_NODE_URL is not defined');
}

if (!process.env.NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID) {
  throw new Error('NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID is not defined');
}

// Initialize OrbisDB instance
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

export type { OrbisConnectResult };

export async function connectUser(provider: any): Promise<OrbisConnectResult> {
  try {
    const auth = new OrbisEVMAuth(provider);
    const [result, error] = await catchError(() => db.connectUser({ auth }));

    if (error) {
      console.error('Error connecting user:', error);
      throw error;
    }

    const connected = await db.isUserConnected();
    if (!connected) {
      throw new Error('Failed to connect user');
    }

    return result;
  } catch (error) {
    console.error('Error in connectUser:', error);
    throw error;
  }
}

export async function isUserConnected(address?: string): Promise<boolean> {
  try {
    return await db.isUserConnected(address);
  } catch (error) {
    console.error('Error checking user connection:', error);
    return false;
  }
}

export async function getConnectedUser(): Promise<OrbisConnectResult | null> {
  try {
    const user = await db.getConnectedUser();
    return user || null;
  } catch (error) {
    console.error('Error getting connected user:', error);
    return null;
  }
}

export async function disconnectUser(): Promise<void> {
  try {
    await db.disconnectUser();
  } catch (error) {
    console.error('Error disconnecting user:', error);
    throw error;
  }
}
