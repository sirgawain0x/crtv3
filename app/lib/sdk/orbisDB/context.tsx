import { createContext, ReactNode, useContext, useState } from 'react';
import { client } from '@app/lib/sdk/thirdweb/client';
import { catchError } from "@useorbis/db-sdk/util"
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import {  OrbisConnectResult, OrbisDB } from '@useorbis/db-sdk';
// import { Wallet } from 'ethers';
import createAssetMetadataModel, { AssetMetadata } from './models/AssetMetadata';
import { download } from 'thirdweb/storage';
import { ASSET_METADATA_MODEL_ID } from '@app/lib/utils/context';

declare global {
  interface Window {
    ethereum: any;
  }
}

interface OrbisContextProps {
    assetMetadataModelId: string;
    authResult: OrbisConnectResult | null;
    setAuthResult: React.Dispatch<React.SetStateAction<OrbisConnectResult | null>>;
    insert: (value: any, modelId: string) => Promise<void>;
    replace: (docId: string, newDoc: any) => Promise<void>;
    update: (docId: string, updates: any) => Promise<void>;
    getAssetMetadata: (assetId: string) => Promise<AssetMetadata | null>;
    orbisLogin: (privateKey?: string) => Promise<OrbisConnectResult | null>;
    isConnected: (address: string) => Promise<boolean>;
    getCurrentUser: () => Promise<any>;
}

const db = new OrbisDB({
  ceramic: {
    gateway: process.env.CERAMIC_NODE_URL as string,
  },
  nodes: [
    {
      gateway: process.env.ORBIS_NODE_URL as string,
      env: process.env.ORBIS_ENVIRONMENT_ID as string,
    },
  ],
});

const OrbisContext = createContext<OrbisContextProps | undefined> ({
    assetMetadataModelId: '',
    authResult: null,
    setAuthResult: () => {},
    insert: async () => {},
    replace: async () => {},
    update: async () => {},
    getAssetMetadata: async () => {},
    orbisLogin: async () => {},
    isConnected: async () => false,
    getCurrentUser: async () => {}
} as unknown as OrbisContextProps);

const crtvContextId = process.env.ORBIS_APP_CONTEXT || 'kjzl6kcym7w8y852d7aatt2nb898ds9z8628ij6chl41ni2kz8ky18ft2xv5m5s';   

export const OrbisProvider = ({ children }: { children: ReactNode }) => {
  const assetMetadataModelId: string = ASSET_METADATA_MODEL_ID;

  const [authResult, setAuthResult] = useState<OrbisConnectResult | null>(null);
  
  const insert = async (value: any, modelId: string): Promise<void> => {
    // console.log('insert', { value, modelId, db });

    if (!value) {
        throw new Error('No value provided. Please provide a value to insert.')
    }

    if (!modelId) {
      throw new Error('No modelId provided. Please provide a modelId.');
    }

    if (!crtvContextId) {
      throw new Error('No contextId provided. Please provide a contextId.');
    }

    if (!db) {
      throw new Error('No db client found.');
    }

    const insertStatement: any = db
      .insert(modelId)
      .value(value)
      .context(crtvContextId);

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

  const getAssetMetadata = async (assetId: string): Promise<AssetMetadata> => {
    if (!assetId) {
      throw new Error('No assetId provided. Please provide a assetId.');
    }

    const selectStatement = db
      .select()
      .from(assetMetadataModelId)
      .where({
        assetId,
      })
      .context(crtvContextId);

    const [result, error] = await catchError(() => selectStatement.run());

    if (error) {
      console.log('selectStatement runs', selectStatement.runs);
      console.error(error);
      throw error;
    }

    const { columns, rows } = result;

    console.log('selectStatement runs', selectStatement.runs);

    const assetMetadata = rows.reduce((acc: any, row: any) => {
      columns.forEach((col, index) => {
        acc[col] = row[index];
      });
      return acc;
    }, {} as AssetMetadata);
    
    if (assetMetadata?.subtitlesUri) {
      assetMetadata.subtitles = download({
        client,
        uri: assetMetadata.subtitlesUri
      });
    };

    return assetMetadata;
  };

  const orbisLogin = async (): Promise<OrbisConnectResult> => {
    
    let provider; 

    if (typeof window !== 'undefined' && window.ethereum) {
      provider = window.ethereum;
    } else {
      throw new Error('No Ethereum provider found. Please install MetaMask or another Web3 wallet.');
    }

    const auth = new OrbisEVMAuth(provider);

    const authResult: OrbisConnectResult = await db.connectUser({ auth });

    // console.log({ authResult });

    const connected = await db.isUserConnected()

    // console.log({ connected });
    
    // if (!connected) {
    //   throw new Error('User is not connected.');
    // }

    return authResult;
  };

  const isConnected = async (address: string = ''): Promise<boolean> => {
    let connected;

    // Check if any user is connected
    if (address !== '') {
      connected = await db.isUserConnected(address);
    } else {
      connected = await db.isUserConnected();
    }

    console.log({ connected });

    return connected;
  };

  const getCurrentUser = async (): Promise<any> => {
    // Get the currently connected user
    const currentUser = await db.getConnectedUser();
    if (!currentUser) {
      // Notify the user or reconnect
      console.log('There is no active user session.');
    }

    console.log({ currentUser });

    return currentUser;
  };

  return (
      <OrbisContext.Provider value={{ 
          assetMetadataModelId,
          authResult,
          setAuthResult,
          insert,
          replace,
          update,
          getAssetMetadata,
          orbisLogin,
          isConnected,
          getCurrentUser
      }}>
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
