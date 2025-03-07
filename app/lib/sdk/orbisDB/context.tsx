import { createContext, ReactNode, useContext, useState } from 'react';
import { client } from '@app/lib/sdk/thirdweb/client';
import { catchError } from '@useorbis/db-sdk/util';
import { OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { OrbisConnectResult, OrbisDB } from '@useorbis/db-sdk';
// import { Wallet } from 'ethers';
import createAssetMetadataModel, {
  AssetMetadata,
} from './models/AssetMetadata';
import { download } from 'thirdweb/storage';
// import { ASSET_METADATA_MODEL_ID, CREATIVE_TV_CONTEXT_ID } from '@app/lib/utils/context';

declare global {
  interface Window {
    ethereum: any;
  }
}

interface OrbisContextProps {
  authResult: OrbisConnectResult | null;
  setAuthResult: React.Dispatch<
    React.SetStateAction<OrbisConnectResult | null>
  >;
  insert: (modelId: string, value: any) => Promise<void>;
  replace: (docId: string, newDoc: any) => Promise<void>;
  update: (docId: string, updates: any) => Promise<void>;
  getAssetMetadata: (assetId: string) => Promise<AssetMetadata | null>;
  orbisLogin: (privateKey?: string) => Promise<OrbisConnectResult | null>;
  isConnected: (address: string) => Promise<boolean>;
  getCurrentUser: () => Promise<any>;
  insertMetokenMetadata: (metadata: {
    address: string;
    token_name: string;
    token_symbol: string;
  }) => Promise<void>;
}

const OrbisContext = createContext<OrbisContextProps | undefined>({
  authResult: null,
  setAuthResult: () => {},
  insert: async () => {},
  replace: async () => {},
  update: async () => {},
  getAssetMetadata: async () => {},
  orbisLogin: async () => {},
  isConnected: async () => false,
  getCurrentUser: async () => {},
  insertMetokenMetadata: async () => {},
} as unknown as OrbisContextProps);

export const OrbisProvider = ({ children }: { children: ReactNode }) => {
  const [authResult, setAuthResult] = useState<OrbisConnectResult | null>(null);

  const ceramicNodeUrl = process.env.NEXT_PUBLIC_CERAMIC_NODE_URL as string;
  const orbisNodeUrl = process.env.NEXT_PUBLIC_ORBIS_NODE_URL as string;
  const orbisEnvironmentId = process.env
    .NEXT_PUBLIC_ORBIS_ENVIRONMENT_ID as string;

  if (!ceramicNodeUrl) {
    throw new Error('CERAMIC_NODE_URL environment variable is required');
  }
  if (!orbisNodeUrl) {
    throw new Error('ORBIS_NODE_URL environment variable is required');
  }
  if (!orbisEnvironmentId) {
    throw new Error('ORBIS_ENVIRONMENT_ID environment variable is required');
  }

  const db = new OrbisDB({
    ceramic: {
      gateway: ceramicNodeUrl,
    },
    nodes: [
      {
        gateway: orbisNodeUrl,
        env: orbisEnvironmentId,
      },
    ],
  });

  const assetMetadataModelId: string = process.env
    .NEXT_PUBLIC_ASSET_METADATA_MODEL_ID as string;
  const crtvContextId: string = process.env
    .NEXT_PUBLIC_ORBIS_CRTV_CONTEXT_ID as string;
  const crtvVideosContextId: string = process.env
    .NEXT_PUBLIC_ORBIS_CRTV_VIDEOS_CONTEXT_ID as string;

  const validateDbOperation = (
    id: string,
    value?: any,
    select: boolean = false,
  ) => {
    if (!id) throw new Error('No id provided');
    if (!select) {
      if (!value) throw new Error('No value provided');
    }
    if (!assetMetadataModelId)
      throw new Error('No assetMetadataModelId provided');
    if (!crtvContextId) throw new Error('No crtvContextId provided');
    if (!crtvVideosContextId)
      throw new Error('No crtvVideosContextId provided');
    if (!db) throw new Error('No db client found');
  };

  const insert = async (modelId: string, value: any): Promise<void> => {
    validateDbOperation(modelId, value);

    const insertStatement: any = db
      .insert(modelId)
      .value(value)
      .context(crtvVideosContextId);

    const validation = await insertStatement.validate();

    if (!validation.valid) {
      throw 'Error during validation: ' + validation.error;
    }

    const [result, error] = await catchError(() => insertStatement.run());

    if (error) {
      console.error(error);
      throw error;
    }

    // console.log('result', result);

    console.log('insertStatement runs', insertStatement.runs);
  };

  const replace = async (docId: string, newDoc: any): Promise<void> => {
    console.log('update', { docId, newDoc, db });

    validateDbOperation(docId, newDoc);

    const replaceStatement: any = db.update(docId).replace(newDoc);

    const query = replaceStatement.build();

    console.log('Query that will be run', query);

    const [result, error] = await catchError(() => query.run());

    if (error) {
      console.error(error);
      throw error;
    }

    console.log('result', result);

    console.log(replaceStatement.runs);
  };

  const update = async (docId: string, updates: any): Promise<void> => {
    console.log('update', { docId, updates, db });

    validateDbOperation(docId, updates);

    const updateStatement: any = db.update(docId).set(updates);

    const query = updateStatement.build();

    console.log('Query that will be run', query);

    const [result, error] = await catchError(() => query.run());

    if (error) {
      console.error(error);
      throw error;
    }

    console.log('result', result);

    console.log(updateStatement.runs);
  };

  const getAssetMetadata = async (
    assetId: string,
  ): Promise<AssetMetadata | null> => {
    try {
      validateDbOperation(assetId, true);

      const selectStatement = db
        .select()
        .from(assetMetadataModelId)
        .where({
          assetId,
        })
        .context(crtvVideosContextId);

      // Build the query first to check it
      const query = selectStatement.build();
      console.log('Query that will be run:', query);

      const [result, error] = await catchError(() => selectStatement.run());

      if (error) {
        console.error('Select statement error:', error);
        throw error;
      }

      const { rows } = result;
      if (!rows?.length) return null;

      // Convert the first row to a plain object with known shape
      const metadata: AssetMetadata = {
        assetId: rows[0].assetId,
        playbackId: rows[0].playbackId,
        title: rows[0].title,
        description: rows[0].description,
        location: rows[0].location,
        category: rows[0].category,
        thumbnailUri: rows[0].thumbnailUri,
        subtitlesUri: rows[0].subtitlesUri,
      };

      // Handle subtitles if they exist
      if (metadata.subtitlesUri) {
        try {
          const res = await download({
            client,
            uri: metadata.subtitlesUri,
          });

          if (res) {
            // Ensure subtitles are in the correct format
            const subtitlesData = res;
            const plainSubtitles = Object.fromEntries(
              Object.entries(subtitlesData).map(([lang, chunks]) => [
                lang,
                (Array.isArray(chunks) ? chunks : []).map((chunk) => ({
                  text: String(chunk.text || ''),
                  timestamp: Array.isArray(chunk.timestamp)
                    ? [...chunk.timestamp]
                    : [],
                })),
              ]),
            );
            metadata.subtitles = plainSubtitles;
          }
        } catch (error) {
          console.error('Failed to fetch subtitles:', error);
          // Don't throw here, just log the error and continue without subtitles
        }
      }

      return metadata;
    } catch (error) {
      console.error('Failed to fetch asset metadata:', error);
      throw error;
    }
  };

  const orbisLogin = async (
    privateKey?: string,
  ): Promise<OrbisConnectResult> => {
    let provider;

    if (typeof window !== 'undefined' && window.ethereum) {
      provider = window.ethereum;
    } else {
      throw new Error(
        'No Ethereum provider found. Please install MetaMask or another Web3 wallet.',
      );
    }

    const auth = new OrbisEVMAuth(provider);

    const authResult: OrbisConnectResult = await db.connectUser({ auth });

    const connected = await db.isUserConnected();

    if (!connected) {
      throw new Error('User is not connected.');
    }

    return authResult;
  };

  const isConnected = async (address: string = ''): Promise<boolean> => {
    let connected;

    if (address !== '') {
      connected = await db.isUserConnected(address);
    } else {
      connected = await db.isUserConnected();
    }

    return connected;
  };

  const getCurrentUser = async (): Promise<any> => {
    const currentUser = await db.getConnectedUser();

    if (!currentUser) {
      throw new Error(
        'No active user session. Please connect your wallet and sign in first.',
      );
    }

    return currentUser;
  };

  const insertMetokenMetadata = async (metadata: {
    address: string;
    token_name: string;
    token_symbol: string;
  }): Promise<void> => {
    try {
      await insert(
        process.env.NEXT_PUBLIC_METOKEN_METADATA_MODEL_ID as string,
        metadata,
      );
    } catch (error) {
      console.error('Failed to insert metoken metadata:', error);
      throw error;
    }
  };

  return (
    <OrbisContext.Provider
      value={{
        authResult,
        setAuthResult,
        insert,
        replace,
        update,
        getAssetMetadata,
        orbisLogin,
        isConnected,
        getCurrentUser,
        insertMetokenMetadata,
      }}
    >
      {children}
    </OrbisContext.Provider>
  );
};

export const useOrbisContext = () => {
  const context = useContext(OrbisContext);
  if (context === undefined) {
    throw new Error('useOrbisContext must be used within a OrbisProvider');
  }
  return context;
};
