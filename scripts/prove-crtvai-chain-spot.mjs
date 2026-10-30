#!/usr/bin/env node
import { createPublicClient, formatEther, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const CRTVAI = '0xecb695544a3d2a64d579b3828f3f60f6932f4846';
const DIAMOND = '0xba5502db2aC2cBff189965e991C07109B14eB3f5';

const HUB_DECIMALS = { 1: 18, 2: 6, 3: 18, 4: 18 };

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });

const info = await client.readContract({
  address: DIAMOND,
  abi: parseAbi([
    'function getMeTokenInfo(address meToken) view returns (address owner, uint256 hubId, uint256 balancePooled, uint256 balanceLocked, uint256 startTime, uint256 endTime, uint256 targetHubId, address migration)',
  ]),
  functionName: 'getMeTokenInfo',
  args: [CRTVAI],
});

const supply = await client.readContract({
  address: CRTVAI,
  abi: parseAbi(['function totalSupply() view returns (uint256)']),
  functionName: 'totalSupply',
});

const hubId = Number(info.hubId ?? info[1] ?? 0);
const pooled = info.balancePooled ?? info[2] ?? 0n;
const locked = info.balanceLocked ?? info[3] ?? 0n;
const decimals = HUB_DECIMALS[hubId] ?? 18;
const raw = BigInt(pooled) + BigInt(locked);
const tvl = Number(raw) / 10 ** decimals;
const price = tvl / parseFloat(formatEther(supply));

console.log(JSON.stringify({
  address: CRTVAI,
  hubId,
  total_supply_wei: supply.toString(),
  tvl_usd_stable: tvl,
  price,
  source: 'public Base RPC (mainnet.base.org)',
}, null, 2));
