import { createContext, ReactNode, useContext, useState } from 'react';
import { db } from './client';
import { catchError } from "@useorbis/db-sdk/util"
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import {  OrbisConnectResult } from '@useorbis/db-sdk';
import { Wallet } from 'ethers';
import { AssetMetadata } from './models/AssetMetadata';
import { title } from 'process';

interface OrbisContextProps {
    authResult: OrbisConnectResult | null;
    setAuthResult: React.Dispatch<React.SetStateAction<OrbisConnectResult | null>>;
    insert: (value: any, modelId: string) => Promise<void>;
    update: (docId: string, updates: any) => Promise<void>;
    getAssetMetadata: (assetId: string) => Promise<any>;
    orbisLogin: (privateKey?: string) => Promise<void>;
    isConnected: (address: string) => Promise<Boolean>;
    getCurrentUser: () => Promise<any>;
}

const OrbisContext = createContext<OrbisContextProps | undefined>({
    authResult: null,
    setAuthResult: () => {},
    insert: async () => {},
    update: async () => {},
    getAssetMetadata: async () => { return { columns: [], rows: [] } },
    orbisLogin: async () => {},
    isConnected: async () => false,
    getCurrentUser: async () => {}
});

const crtvEnvId = process.env.ORBIS_ENVIRONMENT_ID || '';

export const OrbisProvider = ({ children }: { children: ReactNode }) => {
    const [authResult, setAuthResult] = useState<OrbisConnectResult | null>(null);

    const insert = async (value: any, modelId: string): Promise<void> => {
        if (!value) {
            throw new Error('No value provided. Please provide a value to insert.')
        }

        if (!modelId) { 
            throw new Error('No modelId provided. Please provide a modelId.')
        };

        let insertStatement: any;

        insertStatement = await db
            .insert(modelId)
            .value(
                value
            )
            // optionally, you can scope this insert to a specific context
            .context(crtvEnvId);

            // Perform local JSON Schema validation before running the query
        const validation = await insertStatement.validate()

        if(!validation.valid){
            throw "Error during validation: " + validation.error
        }

        const [result, error] = await catchError(() => insertStatement.run())

        if (error) {
            console.error(error);
        }

        console.log(result)
    }

    const update = async (docId: string, updates: any): Promise<void> => {
        // This will perform a shallow merge before updating the document 
        // { ...oldContent, ...newContent }
        const updateStatement = await db
        .update(docId)
        .set(
            updates
        )

        const [result, error] = await catchError(() => updateStatement.run())

        if (error) {
            console.error(error);
        }

        // All runs of a statement are stored within the statement, in case you want to reuse the same statmenet
        console.log(updateStatement.runs)
    }

    const getAssetMetadata = async (assetId: string): Promise<{columns: Array<string>, rows: Array<Record<string, any>>}> => {
        const selectStatement = await db
            .select()
            .from("AssetMetadata")
            .where(
                {
                    column: assetId,
                }
            )
            .context(crtvEnvId)

        const query = selectStatement.build()

        console.log("Query that will be run", query)

        const [result, error] = await catchError(() => selectStatement.run())

        if(error){
            throw error;
        }

        // columns: Array<string>
        // rows: Array<T | Record<string, any>>
        const { columns, rows } = result;

        console.log({ columns, rows })

        return result;
    }

    const orbisLogin = async (/* privateKey: string = '' */): Promise<OrbisConnectResult> => {
        // console.log({ privateKey });
        
        let provider; 

        // if (privateKey !== '') {
            // Browser provider
        provider = window.ethereum;
        // } else {
        //     // Ethers provider
        //     provider = new Wallet(privateKey);
        // }

        // console.log({ provider });

        // Orbis Authenticator
        const auth = new OrbisEVMAuth(provider);

        // console.log({ auth });

        // Authenticate the user and persist the session in localStorage
        const authResult: OrbisConnectResult = await db.connectUser({ auth });

        // Log the result
        // console.log({ authResult })
        return authResult;
    }

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
    }

    const getCurrentUser = async (): Promise<any> => {
        // Get the currently connected user
        const currentUser = await db.getConnectedUser()
        if(!currentUser){
            // Notify the user or reconnect
            console.log("There is no active user session.");
        }

        console.log({ currentUser });

        return currentUser;
    }

    return (
        <OrbisContext.Provider value={{ 
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