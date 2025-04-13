import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export const metokenFactoryContract = {
  address: '0x4b62d9b3de9fab98659693c9ee488d2e4ee56c44',
  abi: [], // Add your contract ABI here
  publicClient,
};
