import type { CeramicClient } from '@ceramicnetwork/http-client';
import type { ComposeClient } from '@composedb/client';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { getResolver } from 'key-did-resolver';
import { DID } from 'dids';
import { DIDSession } from 'did-session';
import { EthereumWebAuth, getAccountId } from '@didtools/pkh-ethereum';
import { SolanaWebAuth, getAccountIdByNetwork } from '@didtools/pkh-solana';
import { StreamID } from '@ceramicnetwork/streamid';
import { ModelInstanceDocument } from '@composedb/types';
import { makeCeramicDaemon } from '@ceramicnetwork/cli/lib/__tests__/make-ceramic-daemon';

const DID_SEED_KEY = 'ceramic:did_seed';

// If you are relying on an injected provider this must be here otherwise you will have a type error.
declare global {
  interface Window {
    ethereum: any;
    solflare: any;
  }
}

export type CeramicClients = {
  ceramic: CeramicClient;
  composeClient: ComposeClient;
};

/**
 * Checks localStorage for a stored DID Session. If one is found we authenticate it, otherwise we create a new one.
 * @returns Promise<DID-Session> - The User's authenticated sesion.
 */
export const authenticateCeramic = async (
  ceramic: CeramicClient,
  compose: ComposeClient,
) => {
  const logged_in = localStorage.getItem('logged_in');
  const popup = document.querySelector('.popup');

  if (logged_in === 'true') {
    return await authenticateKeyDID(ceramic, compose);
  } else {
    if (popup) {
      popup.classList.add('show');
    }
    return null;
  }
};

const authenticateKeyDID = async (
  ceramic: CeramicClient,
  compose: ComposeClient,
) => {
  let seed_array: Uint8Array;
  const storedSeed = localStorage.getItem(DID_SEED_KEY);

  if (!storedSeed) {
    seed_array = new Uint8Array(32);
    window.crypto.getRandomValues(seed_array);
    localStorage.setItem(DID_SEED_KEY, Buffer.from(seed_array).toString('hex'));
  } else {
    seed_array = new Uint8Array(Buffer.from(storedSeed, 'hex'));
  }

  const provider = new Ed25519Provider(seed_array);
  const resolver = getResolver();
  const did = new DID({ provider, resolver });

  await did.authenticate();
  (ceramic as any).did = did;
  (compose as any).setDID(did);

  return did;
};

const authenticateEthPKH = async (
  ceramic: CeramicClient,
  compose: ComposeClient,
) => {
  const sessionStr = localStorage.getItem('ceramic:eth_did');
  let session;

  if (sessionStr) {
    session = JSON.parse(sessionStr);
  }

  if (session) {
    const did = new DID({
      resolver: getResolver(),
    });
    (ceramic as any).did = did;
    (compose as any).setDID(did);
    return did;
  }

  return null;
};
