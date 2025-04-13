import { getContract, defineChain } from 'thirdweb';
import { client } from '@app/lib/sdk/thirdweb/client';
import metokenDiamondABI from './metokenDiamondABI.json';
import { AbiParameterToPrimitiveType } from 'thirdweb';
import { ContractInterface } from 'ethers';

export const metokenDiamondOptimism = getContract({
  client,
  chain: defineChain(10),
  address: '0xdD830E2cdC4023d1744232a403Cf2F6c84e898D1',
  abi: metokenDiamondABI.abi as any,
});

export const metokenDiamondBase = getContract({
  client,
  chain: defineChain(8453),
  address: '0xba5502db2aC2cBff189965e991C07109B14eB3f5',
  abi: metokenDiamondABI.abi as any,
});
