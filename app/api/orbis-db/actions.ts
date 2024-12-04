'use server';

// import { Wallet } from 'ethers';

import { download } from 'thirdweb/storage';
import { client } from '@app/lib/sdk/thirdweb/client';

import { 
    GetAssetMetadataParams, 
    OrbisDBInsertParams, 
    OrbisDBIsConnectedParams, 
    OrbisDBReplaceParams, 
    OrbisDBUpdateParams 
} from '@app/api/orbis-db/types';
import { catchError } from "@useorbis/db-sdk/util"
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import {  OrbisConnectResult, OrbisDB } from '@useorbis/db-sdk';
import { AssetMetadata } from '@app/lib/sdk/orbisDB/models/AssetMetadata';
import { ASSET_METADATA_MODEL_ID, CREATIVE_TV_CONTEXT_ID } from '@app/lib/utils/context';

declare global {
    interface Window {
        ethereum: any;
    }
}

const ceramicNodeUrl = process.env.CERAMIC_NODE_URL as string;
const orbisNodeUrl = process.env.ORBIS_NODE_URL as string;
const orbisEnvironmentId = process.env.ORBIS_ENVIRONMENT_ID as string;   

console.log({
    ceramicNodeUrl,
    orbisNodeUrl,
    orbisEnvironmentId,
});

if (!ceramicNodeUrl) {
    console.log({ ceramicNodeUrl });
    throw new Error('CERAMIC_NODE_URL environment variable is required');
}
if (!orbisNodeUrl) {
    console.log({ orbisNodeUrl });
    throw new Error('ORBIS_NODE_URL environment variable is required');
}
if (!orbisEnvironmentId) {
    console.log({ orbisEnvironmentId });
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

const validateDbOperation = (id: string, value?: any, select: boolean = false) => {
    if (!id) throw new Error('No id provided');
    if (!select) {
        if (!value) throw new Error('No value provided');
    }
    if (!db) throw new Error('No db client found');
};

export const insert = async (params: OrbisDBInsertParams): Promise<any> => {
    validateDbOperation(params.modelId, params.value);

    const insertStatement: any = db
        .insert(params.modelId)
        .value(params.value)
        .context(CREATIVE_TV_CONTEXT_ID);

    const validation = await insertStatement.validate();

    if (!validation.valid) {
        throw 'Error during validation: ' + validation.error;
    }

    const [result, error] = await catchError(() => insertStatement.run());

    if (error) {
        console.error(error);
        throw error;
    }

    console.log('insertStatement runs', insertStatement.runs);

    return result;
};

export const replace = async (params: OrbisDBReplaceParams): Promise<any> => {
    console.log('update', { docId: params.docId, newDoc: params.newDoc, db });

    validateDbOperation(params.docId, params.newDoc);

    const replaceStatement: any = db.update(params.docId).replace(params.newDoc);

    const query = replaceStatement.build();

    console.log('Query that will be run', query);

    const [result, error] = await catchError(() => query.run());

    if (error) {
        console.error(error);
        throw error;
    }

    console.log(replaceStatement.runs);

    return result;
};

export const update = async (params: OrbisDBUpdateParams): Promise<any> => {
    console.log('update', { docId: params.docId, updates: params.updates, db });

    validateDbOperation(params.docId, params.updates);

    const updateStatement: any = db.update(params.docId).set(params.updates);

    const query = updateStatement.build();

    console.log('Query that will be run', query);

    const [result, error] = await catchError(() => query.run());

    if (error) {
        console.error(error);
        throw error;
    }

    console.log(updateStatement.runs);

    return result;
  };

export const getAssetMetadata = async (params: GetAssetMetadataParams): Promise<AssetMetadata> => {
    validateDbOperation(params.assetId, true);

    const selectStatement = db
        .select()
        .from(ASSET_METADATA_MODEL_ID)
        .where({
            assetId: params.assetId,
        })
        .context(CREATIVE_TV_CONTEXT_ID);

    const [result, error] = await catchError(() => selectStatement.run());

    if (error) {
        console.log('selectStatement runs', selectStatement.runs);
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
        try {
            assetMetadata.subtitles = await download({
                client,
                uri: assetMetadata.subtitlesUri
            });
        } catch (error) {
            console.error('Failed to download subtitles', { 
                uri: assetMetadata.subtitlesUri, 
                error 
            });
        }
    };

    return assetMetadata;
};

export const orbisLogin = async (): Promise<OrbisConnectResult> => {
    
    let provider; 

    if (typeof window !== 'undefined' && window.ethereum) {
        provider = window.ethereum;
    } else {
        throw new Error('No Ethereum provider found. Please install MetaMask or another Web3 wallet.');
    }

    const auth = new OrbisEVMAuth(provider);

    const authResult: OrbisConnectResult = await db.connectUser({ auth });

    const connected = await db.isUserConnected()

    if (!connected) {
        throw new Error('User is not connected.');
    }

    return authResult;
};

export const isConnected = async (params: OrbisDBIsConnectedParams): Promise<boolean> => {
    if (!params.address) {
        throw new Error('Error checking if user is connect: please provide a valid address...');
    }
    
    let connected;

    connected = await db.isUserConnected(params.address);

    return connected;
};

export const getCurrentUser = async (): Promise<any> => {
    const currentUser = await db.getConnectedUser();

    if (!currentUser) {
      throw new Error('No active user session. Please connect your wallet and sign in first.');

    }

    return currentUser;
};
