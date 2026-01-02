export const ZoraCreator1155FactoryAbi = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "newContract", "type": "address" },
            { "indexed": true, "name": "creator", "type": "address" },
            { "indexed": true, "name": "defaultAdmin", "type": "address" },
            { "indexed": false, "name": "contractURI", "type": "string" },
            { "indexed": false, "name": "name", "type": "string" },
            { "indexed": false, "name": "defaultRoyaltyConfiguration", "type": "address" }
        ],
        "name": "SetupNewContract",
        "type": "event"
    }
] as const;
