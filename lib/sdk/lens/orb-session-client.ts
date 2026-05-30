import { PublicClient, mainnet, testnet } from '@lens-protocol/client';
import {
  CredentialsStorage,
  InMemoryStorageProvider,
} from '@lens-protocol/storage';
import type { AccessToken, IdToken, RefreshToken } from '@lens-protocol/types';
import type { StoredOrbSession } from '@/lib/sdk/orb/login';

function getLensEnvironment() {
  return process.env.NEXT_PUBLIC_LENS_ENV === 'production' ? mainnet : testnet;
}

/**
 * Resume a Lens SessionClient from Orb QR credentials (same tokens Lens API expects).
 */
export async function resumeLensSessionFromOrb(session: StoredOrbSession) {
  if (!session.accessToken?.trim()) {
    throw new Error('Orb session is missing an access token');
  }

  const environment = getLensEnvironment();
  const storageProvider = new InMemoryStorageProvider();
  const publicClient = PublicClient.create({
    environment,
    storage: storageProvider,
  });

  const credentialsStorage = CredentialsStorage.from(
    storageProvider,
    environment.name,
  );

  const tokens = {
    accessToken: session.accessToken as AccessToken,
    idToken: (session.idToken ?? session.accessToken) as IdToken,
    refreshToken: (session.refreshToken ?? session.accessToken) as RefreshToken,
  };

  const setResult = await credentialsStorage.set(tokens);
  if (setResult.isErr()) {
    throw new Error(setResult.error.message);
  }

  const resumeResult = await publicClient.resumeSession();
  if (resumeResult.isErr()) {
    throw new Error(resumeResult.error.message);
  }

  return resumeResult.value;
}
