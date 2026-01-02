import { createConfig } from "@ponder/core";
import { http } from "viem";

import { SoundCreatorV1Abi } from "./abis/SoundCreatorV1Abi";
import { ZoraCreator1155FactoryAbi } from "./abis/ZoraCreator1155FactoryAbi";

export default createConfig({
    networks: {
        mainnet: {
            chainId: 1,
            transport: http(process.env.PONDER_RPC_URL_1),
        },
        optimism: {
            chainId: 10,
            transport: http(process.env.PONDER_RPC_URL_10),
        },
        base: {
            chainId: 8453,
            transport: http(process.env.PONDER_RPC_URL_8453),
        },
    },
    contracts: {
        SoundCreatorV1: {
            abi: SoundCreatorV1Abi,
            network: {
                mainnet: {
                    address: "0x78E3aDc0E811e4f93BD9F1f9389b923c9A3355c2",
                    startBlock: 18000000,
                },
            },
        },
        ZoraCreator1155Factory: {
            abi: ZoraCreator1155FactoryAbi,
            network: {
                base: {
                    address: "0x777777C338d93e2C7CAF734d0557096d2b6348ef", // Commonly used deterministic address for Zora
                    startBlock: 6000000,
                },
                optimism: {
                    address: "0x777777C338d93e2C7CAF734d0557096d2b6348ef",
                    startBlock: 6000000,
                }
            },
        },
    },
});
