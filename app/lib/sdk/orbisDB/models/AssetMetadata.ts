import { db } from "../client";

export type AssetMetadata = {
    assetId?: string;
    title?: string;
    description?: string;
    location?: string;
    category?: string;
    thumbnail?: string;
    subtitlesUri?: string;
};

const createModel = async () => await db.ceramic.createModel({
    "name": "AssetMetadata",
    "version": "2.0",
    "interface": false,
    "immutableFields": [],
    "implements": [],
    "accountRelation": {
        "type": "list"
    },
    "schema": {
        "type": "object",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "properties": {
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
            "subtitlesUri": {
                "type": "string"
            }
        },
        "additionalProperties": false
    }
});
