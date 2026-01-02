export const SoundCreatorV1Abi = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "soundEdition", "type": "address" },
            { "indexed": true, "name": "deployer", "type": "address" },
            { "indexed": false, "name": "initData", "type": "bytes" },
            { "indexed": false, "name": "contracts", "type": "address[]" },
            { "indexed": false, "name": "data", "type": "bytes[]" },
            { "indexed": false, "name": "results", "type": "bytes[]" }
        ],
        "name": "SoundEditionCreated",
        "type": "event"
    }
] as const;
