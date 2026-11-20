import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { encodeAbiParameters, parseAbiParameters, toEventSelector } from 'viem';
import { METOKEN_DIAMOND_BASE } from '@/lib/contracts/metokens/deployments';
import { HUB_ASSET_CONFIGS } from '@/lib/contracts/MeTokenHubs';

const mocks = vi.hoisted(() => ({ rpc: { getBlock: vi.fn(), getLogs: vi.fn() }, from: vi.fn(), upsert: vi.fn(), sync: vi.fn() }));
vi.mock('viem', async original => ({ ...await original<typeof import('viem')>(), createPublicClient: () => mocks.rpc }));
vi.mock('@/lib/sdk/supabase/service', () => ({ createServiceClient: () => ({ from: mocks.from }) }));
vi.mock('@/lib/metokens/syncMeTokenMarketData', () => ({ syncMeTokenMarketData: (...args: unknown[]) => mocks.sync(...args) }));
import { decodeTradeLog, indexMeTokenTrades, MINT_EVENT, BURN_EVENT, readTradeLogs, tradeEventId, type TradeLog } from './tradeIndexer';

const token = '0x1111111111111111111111111111111111111111';
const wallet = '0x2222222222222222222222222222222222222222';
const hash = ('0x' + 'a'.repeat(64)) as `0x${string}`;
let existing: Array<Record<string, unknown>>;
function log(index = 1, burn = false): TradeLog {
  return { address: METOKEN_DIAMOND_BASE, topics: [toEventSelector(burn ? BURN_EVENT : MINT_EVENT)],
    data: encodeAbiParameters(parseAbiParameters('address,address,address,address,uint256,uint256'),
      [token, HUB_ASSET_CONFIGS.USDC.address, wallet, wallet, burn ? 4957201216162959000n : 28150000n, burn ? 28150000n : 4957201216162959000n]),
    transactionHash: hash, blockNumber: 99n, logIndex: index };
}
beforeEach(() => {
  vi.clearAllMocks(); existing = [];
  vi.stubEnv('METOKEN_INDEXER_RPC_URL', 'https://rpc.example/private-key');
  vi.stubEnv('METOKEN_TRADE_INDEXER_ENABLED', 'true');
  mocks.rpc.getBlock.mockImplementation(async args => args.blockTag ? { number: 100n, timestamp: 1700000000n } : { number: args.blockNumber, timestamp: 1699999999n });
  mocks.rpc.getLogs.mockResolvedValue([log()]);
  mocks.sync.mockResolvedValue({ tvl: 37.27 });
  mocks.upsert.mockImplementation(rows => ({ select: async () => ({ data: rows.map((row: { id: string }) => ({ id: row.id })), error: null }) }));
  mocks.from.mockImplementation(table => table === 'metokens'
    ? { select: () => ({ in: async () => ({ data: [{ id: 'token-row', address: token, hub_id: 1 }], error: null }) }) }
    : { select: () => ({ in: () => ({ order: () => ({ range: async () => ({ data: existing, error: null }) }) }) }), upsert: mocks.upsert });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('trade event identities and decoding', () => {
  it('uses event collateral decimals and preserves fractional token units for mint and burn', () => {
    for (const burn of [false, true]) expect(decodeTradeLog(log(1, burn))).toMatchObject({ amount: '4.957201216162959', collateral: '28.15', type: burn ? 'burn' : 'mint' });
  });
  it('ignores unrelated emitters and removed logs', () => {
    expect(decodeTradeLog({ ...log(), address: token })).toBeNull();
    expect(decodeTradeLog({ ...log(), removed: true })).toBeNull();
  });
  it('rejects incomplete event identity and unsupported assets', () => {
    expect(() => decodeTradeLog({ ...log(), logIndex: null })).toThrow('Malformed');
    const bad = log(); bad.data = bad.data.slice(0, 66) + '0'.repeat(24) + token.slice(2) + bad.data.slice(130);
    expect(() => decodeTradeLog(bad)).toThrow('Unsupported');
  });
  it('keys each log separately and normalizes hash case', () => {
    expect(tradeEventId(hash, 1)).not.toBe(tradeEventId(hash, 2));
    expect(tradeEventId(hash, 1)).toBe(tradeEventId(hash.toUpperCase(), 1));
  });
});
describe('bounded ingestion', () => {
  it('defaults to preview and never writes', async () => {
    const result = await indexMeTokenTrades();
    expect(result.eventsFound).toBe(1); expect(result.inserted).toBe(0); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('keeps two mints in one transaction and uses PK-backed upserts with block time', async () => {
    mocks.rpc.getLogs.mockResolvedValue([log(1), log(2)]);
    const result = await indexMeTokenTrades({ dryRun: false });
    expect(result.inserted).toBe(2);
    const [rows, options] = mocks.upsert.mock.calls[0];
    expect(new Set(rows.map((row: { id: string }) => row.id)).size).toBe(2);
    expect(options).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    expect(rows[0]).toMatchObject({ amount: '4.957201216162959', collateral_amount: '28.15', created_at: '2023-11-14T22:13:19.000Z' });
  });
  it('skips already indexed event ids', async () => {
    existing = [{ id: tradeEventId(hash, 1) }];
    expect((await indexMeTokenTrades({ dryRun: false })).duplicatesSkipped).toBe(1);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('retries post-trade market refresh for already indexed events', async () => {
    existing = [{ id: tradeEventId(hash, 1) }]; mocks.sync.mockResolvedValue(null);
    const result = await indexMeTokenTrades({ dryRun: false });
    expect(result.inserted).toBe(0); expect(result.errors).toHaveLength(1);
    expect(mocks.sync).toHaveBeenCalledWith(token); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('matches legacy UI rows without duplicating them', async () => {
    existing = [{ id: 'legacy', metoken_id: 'token-row', transaction_hash: hash, transaction_type: 'mint', amount: 4.957201216162959, collateral_amount: 28.15, user_address: wallet }];
    expect((await indexMeTokenTrades({ dryRun: false })).duplicatesSkipped).toBe(1);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('requires reconciliation for conflicting legacy records', async () => {
    existing = [{ id: 'legacy', metoken_id: 'token-row', transaction_hash: hash, transaction_type: 'mint', amount: 2, collateral_amount: 1, user_address: wallet }];
    await expect(indexMeTokenTrades({ dryRun: false })).rejects.toThrow('reconciliation');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('requires an explicit write flag before any RPC call', async () => {
    vi.stubEnv('METOKEN_TRADE_INDEXER_ENABLED', 'false');
    await expect(indexMeTokenTrades({ dryRun: false })).rejects.toThrow('disabled');
    expect(mocks.rpc.getBlock).not.toHaveBeenCalled();
  });
  it('rejects fractional, oversized and unfinalized windows', async () => {
    for (const options of [{ fromBlock: 0.5 }, { lookbackBlocks: 50_001 }, { toBlock: 101 }, { fromBlock: 0, toBlock: 50_001 }]) {
      await expect(indexMeTokenTrades(options)).rejects.toThrow();
    }
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('never inserts with a wall-clock fallback after timestamp failure', async () => {
    mocks.rpc.getBlock.mockImplementation(async args => { if (args.blockTag) return { number: 100n }; throw new Error('timestamp unavailable'); });
    await expect(indexMeTokenTrades({ dryRun: false })).rejects.toThrow(); expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('fails the whole window on an unreadable range and sanitizes upstream keys', async () => {
    mocks.rpc.getLogs.mockRejectedValue(new Error('https://rpc.example/private-key unavailable'));
    await expect(indexMeTokenTrades({ dryRun: false })).rejects.toThrow('Unable to read complete');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('splits range-cap errors but never calls the failed parent again', async () => {
    mocks.rpc.getLogs.mockImplementation(async ({ fromBlock, toBlock }) => { if (toBlock - fromBlock > 1n) throw new Error('block range capped'); return []; });
    await expect(readTradeLogs(mocks.rpc as never, 1, 4)).resolves.toEqual([]);
    expect(mocks.rpc.getLogs).toHaveBeenCalledTimes(3);
  });
  it('backs off throttling on the same range and stops instead of multiplying requests', async () => {
    vi.useFakeTimers(); mocks.rpc.getLogs.mockRejectedValue(new Error('429 rate limit'));
    const failure = expect(readTradeLogs(mocks.rpc as never, 1, 100)).rejects.toThrow('rate limit');
    await vi.runAllTimersAsync(); await failure;
    expect(mocks.rpc.getLogs).toHaveBeenCalledTimes(4);
    for (const [options] of mocks.rpc.getLogs.mock.calls) expect(options).toMatchObject({ fromBlock: 1n, toBlock: 100n });
  });
});
