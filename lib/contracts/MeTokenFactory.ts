import { Address } from 'viem';

export const METOKEN_FACTORY_ADDRESSES = {
  base: '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B' as Address,
  // Add other networks as needed
} as const;

export const METOKEN_FACTORY_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "diamond",
        "type": "address"
      }
    ],
    "name": "create",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const getMeTokenFactoryContract = (chainId: keyof typeof METOKEN_FACTORY_ADDRESSES) => ({
  address: METOKEN_FACTORY_ADDRESSES[chainId],
  abi: METOKEN_FACTORY_ABI,
});

export type MeTokenFactoryContract = ReturnType<typeof getMeTokenFactoryContract>;
