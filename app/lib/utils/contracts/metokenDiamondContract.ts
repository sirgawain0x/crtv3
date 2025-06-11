import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export const metokenDiamondContract = {
  address: '0x13b818daf7016b302383737ba60c3a39fef231cf',
  abi: [], // Add your contract ABI here
  publicClient,
};
