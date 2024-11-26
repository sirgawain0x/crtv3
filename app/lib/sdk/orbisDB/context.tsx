declare global {
  interface Window {
    ethereum: any;
  }
}

import { createContext, ReactNode, useContext, useState } from 'react';
import { db } from './client';
import { client } from '@app/lib/sdk/thirdweb/client';
import { catchError } from "@useorbis/db-sdk/util"
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import {  OrbisConnectResult } from '@useorbis/db-sdk';
// import { Wallet } from 'ethers';
import createAssetMetadataModel, { AssetMetadata } from './models/AssetMetadata';
import { download } from 'thirdweb/storage';

interface OrbisContextProps {
    assetMetadataModelID: string;
    authResult: OrbisConnectResult | null;
    setAuthResult: React.Dispatch<React.SetStateAction<OrbisConnectResult | null>>;
    insert: (value: any, modelId: string) => Promise<void>;
    update: (docId: string, updates: any) => Promise<void>;
    getAssetMetadata: (assetId: string) => Promise<AssetMetadata | null>;
    orbisLogin: (privateKey?: string) => Promise<OrbisConnectResult | null>;
    isConnected: (address: string) => Promise<Boolean>;
    getCurrentUser: () => Promise<any>;
}

const OrbisContext = createContext<OrbisContextProps | undefined> ({
    assetMetadataModelID: 'kjzl6hvfrbw6c6itfx7h76zcrpch2gm2u4bws8gxi0zvw1n8pg5v8rvli7b1blr',
    authResult: null,
    setAuthResult: () => {},
    insert: async () => {},
    update: async () => {},
    getAssetMetadata: async () => {},
    orbisLogin: async () => {},
    isConnected: async () => false,
    getCurrentUser: async () => {}
} as unknown as OrbisContextProps);

const crtvEnvId = process.env.ORBIS_ENVIRONMENT_ID || '';
const crtvContextId = process.env.ORBIS_APP_CONTEXT || '';   

export const OrbisProvider = ({ children }: { children: ReactNode }) => {
    const assetMetadataModelID: string = 'kjzl6hvfrbw6c6itfx7h76zcrpch2gm2u4bws8gxi0zvw1n8pg5v8rvli7b1blr';

    const [authResult, setAuthResult] = useState<OrbisConnectResult | null>(null);
    
    const insert = async (value: any, modelId: string): Promise<void> => {
        console.log('insert', { value, modelId });
        if (!value) {
            throw new Error('No value provided. Please provide a value to insert.')
        }

    if (!modelId) {
      throw new Error('No modelId provided. Please provide a modelId.');
    }

    let insertStatement: any;

        insertStatement = await db
            .insert(modelId)
            .value(
                value
            )
            .context(crtvContextId);

    const validation = await insertStatement.validate();

    if (!validation.valid) {
      throw 'Error during validation: ' + validation.error;
    }

    const [result, error] = await catchError(() => insertStatement.run());

    if (error) {
      console.error(error);
    }

    console.log('result', result);
  };

  const update = async (docId: string, updates: any): Promise<void> => {
    // This will perform a shallow merge before updating the document
    // { ...oldContent, ...newContent }
    const updateStatement = db.update(docId).set(updates);

    const [result, error] = await catchError(() => updateStatement.run());

    if (error) {
      console.error(error);
    }

    // All runs of a statement are stored within the statement, in case you want to reuse the same statmenet
    console.log(updateStatement.runs);

    console.log('result', result);
  };

    const getAssetMetadata = async (assetId: string): Promise<AssetMetadata> => {
        const selectStatement = db
            .select()
            .from("AssetMetadata")
            .where(
                {
                    column: assetId,
                }
            )
            .context(crtvEnvId)

    const query = selectStatement.build();

    console.log('Query that will be run', query);

    const [result, error] = await catchError(() => selectStatement.run());

    if (error) {
      throw error;
    }

    const { columns, rows } = result;

    const assetMetadata = rows.reduce((acc, row) => {
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

    console.log({ assetMetadata });

    return assetMetadata;
  };

    const orbisLogin = async (): Promise<OrbisConnectResult> => {
        
      let provider; 

      provider = window.ethereum;

      console.log({ provider });

      const auth = new OrbisEVMAuth(provider);

      console.log({ auth });

      const authResult: OrbisConnectResult = await db.connectUser({ auth });

      console.log({ authResult });

      // const createRes = await createAssetMetadataModel();

      // console.log({ createRes });

      return authResult;
    };

  const isConnected = async (address: string = ''): Promise<Boolean> => {
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
            assetMetadataModelID,
            authResult,
            setAuthResult,
            insert,
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
