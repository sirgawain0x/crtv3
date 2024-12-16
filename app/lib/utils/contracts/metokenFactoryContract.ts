import { getContract, defineChain } from 'thirdweb';
import { client } from '@app/lib/sdk/thirdweb/client';
import metokenFactoryABI from './metokenFactoryABI.json';

export const metokenFactoryOptimism = getContract({
  client,
  chain: defineChain(10),
  address: '0x7BE650f4AA109377c1bBbEE0851CF72A8e7E915C',
  abi: metokenFactoryABI.abi as any,
});

export const metokenFactoryBase = getContract({
  client,
  chain: defineChain(8453),
  address: '0xb31Ae2583d983faa7D8C8304e6A16E414e721A0B',
  abi: metokenFactoryABI.abi as any,
});
