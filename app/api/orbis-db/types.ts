export type OrbisDBInsertParams = {
    modelId: string;
    value: any;
}

export type OrbisDBReplaceParams = {
    docId: string;
    newDoc: any;
}

export type OrbisDBUpdateParams = {
    docId: string;
    updates: any;
}

export type GetAssetMetadataParams = {
    assetId: string;
}

export type OrbisDBIsConnectedParams = {
    address: string;
}