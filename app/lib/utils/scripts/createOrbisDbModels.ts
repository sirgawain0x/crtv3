import dotenv from "dotenv";
import { OrbisKeyDidAuth, OrbisEVMAuth } from '@useorbis/db-sdk/auth';
import { OrbisDB } from '@useorbis/db-sdk';
import { Wallet } from 'ethers';

dotenv.config();

interface Subtitle {
    text: string;
    startTime: number;
    endTime: number;
}

interface AssetMetadata {
    assetId: string;
    playbackId?: string;
    title: string;
    description: string;
    location?: string;
    category?: string;
    string;
    subtitles: {
        "English"?: Subtitle[];
        "Chinese"?: Subtitle[];
        "German"?: Subtitle[];
        "Spanish"?: Subtitle[];
        };
    }

    export const db = new OrbisDB({
        "ceramic": {
        "gateway": process.env.CERAMIC_NODE_URL || "https://ceramic-orbisdb-mainnet-direct.hirenodes.io/",
        },
        "nodes": [
        {
            "gateway": process.env.ORBIS_NODE_URL || "https://studio.useorbis.com",
            "env": `${process.env.ORBIS_ENVIRONMENT_ID}`,
        },
        ],
    });

    const createAssetMetadataModel = async (client: OrbisDB) => ({
        "name": "AssetMetadata",
        "version": "1.0",
        "interface": false,
        "immutableFields": [],
        "implements": [],
        "accountRelation": {
        "type": "single"
        },
        "schema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "assetId": {
            "type": "string"
            },
            "playbackId": {
            "type": "string"
            },
            "title": {
            "type": "string"
            },
            "description": {
            "type": "string"
            },
            "location": {
            "type": "string"
            },
            "category": {
            "type": "string"
            },
            "thumbnailUri": {
            "type": "string"
            },
            "subtitles": {
            "type": "object",
            "properties": {
                "English": {
                "type": "array",
                "items": {
                    "$ref": "#/definitions/Subtitle"
                }
                },
                "Chinese": {
                "type": "array",
                "items": {
                    "$ref": "#/definitions/Subtitle"
                }
                },
                "German": {
                "type": "array",
                "items": {
                    "$ref": "#/definitions/Subtitle"
                }
                },
                "Spanish": {
                "type": "array",
                "items": {
                    "$ref": "#/definitions/Subtitle"
                }
                },
            },
            "additionalProperties": false,
            "$defs": {
                "Subtitle": {
                "type": "object",
                "properties": {
                    "text": {
                    "type": "string"
                    },
                    "startTime": {
                    "type": "number"
                    },
                    "endTime": {
                    "type": "number"
                    }
                },
                "additionalProperties": false
                }
            },
            "required": []
            }
        },
        "additionalProperties": false,
        "required": [
            "assetId",
            "title",
            "description",
            "thumbnailUri",
            "subtitles"
        ],
        }
    });

const run = async () => {
    console.log('Running script to create OrbisDB models');

    // Initiate the authenticator using the generated (or persisted) seed
    const auth = await OrbisKeyDidAuth.fromSeed(process.env.THIRDWEB_ADMIN_PRIVATE_KEY as string);

    console.log({ auth });

    // Authenticate the user and persist the session
    const authResult = await db.connectUser({ auth });

    console.log({ authResult });

    // Create the OrbisDB Asset Metadata model
    const assetMetadataResponse = await createAssetMetadataModel(db);

    console.log({ assetMetadataResponse });
};

// Handle errors in the main function
run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });