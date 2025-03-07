'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from 'react';
import { client } from '@app/lib/sdk/thirdweb/client';
import { catchError } from '@useorbis/db-sdk/util';
import { OrbisKeyDidAuth } from '@useorbis/db-sdk/auth';
import { OrbisConnectResult } from '@useorbis/db-sdk';
import { db } from './client';
import createAssetMetadataModel, {
  AssetMetadata,
} from './models/AssetMetadata';
import { download } from 'thirdweb/storage';

declare global {
  interface Window {
    ethereum: any;
  }
}

interface SerializableAuthResult {
  did: string;
  details: Record<string, any>;
}

interface OrbisContextProps {
  authResult: SerializableAuthResult | null;
  setAuthResult: React.Dispatch<
    React.SetStateAction<SerializableAuthResult | null>
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
  logout: () => Promise<void>;
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
  logout: async () => {},
} as unknown as OrbisContextProps);

export const OrbisProvider = ({ children }: { children: ReactNode }) => {
  const [authResult, setAuthResult] = useState<SerializableAuthResult | null>(
    null,
  );

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const currentUser = await db.getConnectedUser();
      if (currentUser) {
        setAuthResult({
          did: currentUser.user.did,
          details: JSON.parse(JSON.stringify(currentUser)),
        });
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  };

  // Check for required environment variables
  useEffect(() => {
    const requiredEnvVars = {
      NEXT_PUBLIC_ORBIS_ASSET_METADATA_MODEL_ID:
        process.env.NEXT_PUBLIC_ORBIS_ASSET_METADATA_MODEL_ID,
      NEXT_PUBLIC_ORBIS_CRTV_CONTEXT_ID:
        process.env.NEXT_PUBLIC_ORBIS_CRTV_CONTEXT_ID,
      NEXT_PUBLIC_ORBIS_CRTV_VIDEOS_CONTEXT_ID:
        process.env.NEXT_PUBLIC_ORBIS_CRTV_VIDEOS_CONTEXT_ID,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      );
    }
  }, []);

  const assetMetadataModelId: string = process.env
    .NEXT_PUBLIC_ORBIS_ASSET_METADATA_MODEL_ID as string;
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

    // Check environment variables with more descriptive error messages
    if (!assetMetadataModelId)
      throw new Error(
        'Environment variable NEXT_PUBLIC_ORBIS_ASSET_METADATA_MODEL_ID is missing',
      );
    if (!crtvContextId)
      throw new Error(
        'Environment variable NEXT_PUBLIC_ORBIS_CRTV_CONTEXT_ID is missing',
      );
    if (!crtvVideosContextId)
      throw new Error(
        'Environment variable NEXT_PUBLIC_ORBIS_CRTV_VIDEOS_CONTEXT_ID is missing',
      );
    if (!db) throw new Error('OrbisDB client is not initialized');
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
        .where({ assetId })
        .context(crtvVideosContextId);

      const [result, error] = await catchError(() => selectStatement.run());

      if (error) {
        console.error('Select statement error:', error);
        throw error;
      }

      const { rows } = result;
      if (!rows?.length) return null;

      // Create a plain serializable object
      const metadata: AssetMetadata = {
        assetId: rows[0].assetId,
        playbackId: rows[0].playbackId,
        title: rows[0].title,
        description: rows[0].description,
        location: rows[0].location,
        category: rows[0].category,
        thumbnailUri: rows[0].thumbnailUri,
        subtitlesUri: rows[0].subtitlesUri,
        subtitles: undefined,
      };

      // Handle subtitles if they exist
      if (metadata.subtitlesUri) {
        try {
          const res = await download({
            client,
            uri: metadata.subtitlesUri,
          });

          if (res) {
            // Convert to plain object
            metadata.subtitles = Object.fromEntries(
              Object.entries(res).map(([lang, chunks]) => [
                lang,
                (Array.isArray(chunks) ? chunks : []).map((chunk) => ({
                  text: String(chunk.text || ''),
                  timestamp: Array.isArray(chunk.timestamp)
                    ? [...chunk.timestamp]
                    : [],
                })),
              ]),
            );
          }
        } catch (error) {
          console.error('Failed to fetch subtitles:', error);
        }
      }

      return metadata;
    } catch (error) {
      console.error('Failed to fetch asset metadata:', error);
      throw error;
    }
  };

  const orbisLogin = async (): Promise<OrbisConnectResult | null> => {
    try {
      // Generate a new seed
      const seed = await OrbisKeyDidAuth.generateSeed();

      // Create auth instance from seed
      const auth = await OrbisKeyDidAuth.fromSeed(seed);

      // Connect user - OrbisDB will handle session persistence automatically
      const result = await db.connectUser({ auth });

      // Serialize the result before setting state
      setAuthResult({
        did: result.user.did,
        details: JSON.parse(JSON.stringify(result)),
      });

      return result;
    } catch (error) {
      console.error('Orbis login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await db.disconnectUser();
      setAuthResult(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const isConnected = async (address?: string): Promise<boolean> => {
    return await db.isUserConnected(address);
  };

  const getCurrentUser = async () => {
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
        logout,
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
