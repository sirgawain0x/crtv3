import { createConfig } from "ponder";
import { http } from "viem";

import { SoundCreatorV1Abi } from "./abis/SoundCreatorV1Abi";
import { ZoraCreator1155FactoryAbi } from "./abis/ZoraCreator1155FactoryAbi";
import { SupercollectorFactoryAbi } from "./abis/SupercollectorFactoryAbi";

export default createConfig({
    chains: {
        mainnet: {
            id: 1,
            rpc: http(process.env.PONDER_RPC_URL_1),
        },
        optimism: {
            id: 10,
            rpc: http(process.env.PONDER_RPC_URL_10),
        },
        base: {
            id: 8453,
            rpc: http(process.env.PONDER_RPC_URL_8453),
        },
    },
    contracts: {
        SoundCreatorV1: {
            abi: SoundCreatorV1Abi,
            chain: {
                mainnet: {
                    address: "0xAef3e8c8723D9c31863BE8dE54dF2668Ef7c4B89",
                    startBlock: 15570834,
                },
            },
        },
        ZoraCreator1155Factory: {
            abi: ZoraCreator1155FactoryAbi,
            chain: {
                base: {
                    address: "0x777777751622c0d3258f214F9DF38E35BF45baF3",
                    startBlock: 2000000,
                },
                optimism: {
                    address: "0x777777751622c0d3258f214F9DF38E35BF45baF3",
                    startBlock: 105000000,
                }
            },
        },
        SupercollectorFactory: {
            abi: SupercollectorFactoryAbi,
            chain: {
                optimism: {
                    address: "0x68392873003d60229011c14cf2970365e9c8bd3f",
                    startBlock: 96976821,
                },
            },
        },
    },
});
