import { CONTRACT_ADDRESS } from '@app/lib/utils/context';
import { getContract } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { client } from './client';

export const videoContract = getContract({
  address: CONTRACT_ADDRESS.editionDrop.erc1155.base,
  chain: base,
  client,
});

export const erc20Contract = (address: string, chain = base) =>
  getContract({
    address,
    chain,
    client,
  });
