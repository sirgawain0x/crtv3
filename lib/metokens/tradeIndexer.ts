/** Bounded, finalized Base Mint/Burn ingestion. Defaults to a read-only preview. */
import { createHash } from 'node:crypto';
import { createPublicClient, http, parseAbiItem, formatUnits, toEventSelector, type PublicClient } from 'viem';
import { baseMainnet } from '@/lib/utils/chains/base';
import { METOKEN_DIAMOND_BASE } from '@/lib/contracts/metokens/deployments';
import { getHubAssetByAddress } from '@/lib/contracts/MeTokenHubs';
import { createServiceClient } from '@/lib/sdk/supabase/service';
import { syncMeTokenMarketData } from '@/lib/metokens/syncMeTokenMarketData';

export const MINT_EVENT = parseAbiItem('event Mint(address meToken, address asset, address depositor, address recipient, uint256 assetsDeposited, uint256 meTokensMinted)');
export const BURN_EVENT = parseAbiItem('event Burn(address meToken, address asset, address burner, address recipient, uint256 meTokensBurned, uint256 assetsReturned)');
const MINT_TOPIC = toEventSelector(MINT_EVENT).toLowerCase();
const BURN_TOPIC = toEventSelector(BURN_EVENT).toLowerCase();
export const DEFAULT_LOOKBACK_BLOCKS = 50_000;
export const MAX_INDEX_BLOCKS = 50_000;
const CHUNK_BLOCKS = 2_000;
const RANGE_CAP_ERROR = /limited to[^.]*range|range[s]? over \d+|block range|response size|too many results/i;
const THROTTLE_ERROR = /rate limit|request limit|too many requests|capacity|throttl|\b429\b/i;

export interface TradeIndexerOptions { fromBlock?: number; toBlock?: number; lookbackBlocks?: number; dryRun?: boolean }
export interface TradeLog {
  address: string; topics: readonly string[]; data: string; transactionHash: string | null;
  blockNumber: string | number | bigint | null; logIndex: number | null; removed?: boolean;
}
export interface IndexedTrade {
  meToken: string; asset: string; type: 'mint' | 'burn'; amount: string; collateral: string;
  userAddress: string; transactionHash: string; blockNumber: number; logIndex: number;
}
export interface TradeIndexerResult {
  fromBlock: number; toBlock: number; blocksScanned: number; eventsFound: number; inserted: number;
  duplicatesSkipped: number; unknownTokens: string[]; errors: string[]; insertedRows: IndexedTrade[];
}

export function createIndexerClient(): PublicClient {
  const key = process.env.ALCHEMY_API_KEY?.trim();
  const rpc = process.env.METOKEN_INDEXER_RPC_URL?.trim() || process.env.BASE_RPC_URL?.trim()
    || process.env.ALCHEMY_RPC_URL?.trim() || (key ? 'https://base-mainnet.g.alchemy.com/v2/' + key : '');
  if (!rpc || new URL(rpc).protocol !== 'https:') throw new Error('Configure a server-side HTTPS RPC for trade indexing');
  return createPublicClient({ chain: baseMainnet, transport: http(rpc, { timeout: 15_000, retryCount: 0 }) }) as PublicClient;
}

/** Same event has the same primary key across retries and overlapping workers. */
export function tradeEventId(transactionHash: string, logIndex: number): string {
  const hash = createHash('sha256').update('8453:' + METOKEN_DIAMOND_BASE.toLowerCase() + ':' + transactionHash.toLowerCase() + ':' + logIndex).digest('hex');
  return hash.slice(0, 8) + '-' + hash.slice(8, 12) + '-5' + hash.slice(13, 16) + '-a' + hash.slice(17, 20) + '-' + hash.slice(20, 32);
}

export function decodeTradeLog(log: TradeLog): IndexedTrade | null {
  const topic = String(log.topics[0] ?? '').toLowerCase();
  if (log.removed || log.address.toLowerCase() !== METOKEN_DIAMOND_BASE.toLowerCase() || (topic !== MINT_TOPIC && topic !== BURN_TOPIC)) return null;
  if (!/^0x[0-9a-f]{384}$/i.test(log.data) || !/^0x[0-9a-f]{64}$/i.test(log.transactionHash ?? '')
    || log.logIndex == null || !Number.isSafeInteger(log.logIndex) || log.logIndex < 0 || log.blockNumber == null) throw new Error('Malformed trade event');
  const blockNumber = Number(log.blockNumber);
  if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) throw new Error('Invalid trade block');
  const words = log.data.slice(2).match(/.{64}/g)!;
  const address = (index: number) => '0x' + words[index].slice(-40).toLowerCase();
  const asset = address(1);
  // Use the historical event's asset, never today's hub (which may have migrated).
  const hub = getHubAssetByAddress(asset);
  if (!hub) throw new Error('Unsupported trade collateral asset');
  const mint = topic === MINT_TOPIC;
  return { meToken: address(0), asset, type: mint ? 'mint' : 'burn',
    amount: formatUnits(BigInt('0x' + words[mint ? 5 : 4]), 18),
    collateral: formatUnits(BigInt('0x' + words[mint ? 4 : 5]), hub.decimals),
    userAddress: address(2), transactionHash: log.transactionHash!.toLowerCase(), blockNumber, logIndex: log.logIndex };
}

export async function readTradeLogs(client: PublicClient, start: number, end: number, attempt = 0): Promise<TradeLog[]> {
  try {
    return await client.getLogs({ address: METOKEN_DIAMOND_BASE, events: [MINT_EVENT, BURN_EVENT], fromBlock: BigInt(start), toBlock: BigInt(end) }) as unknown as TradeLog[];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (THROTTLE_ERROR.test(message)) {
      if (attempt >= 3) throw new Error('Trade RPC rate limit; retry the same window later');
      await new Promise(resolve => setTimeout(resolve, 1_000 * 2 ** attempt));
      return readTradeLogs(client, start, end, attempt + 1);
    }
    if (RANGE_CAP_ERROR.test(message) && start < end) {
      const middle = Math.floor((start + end) / 2);
      return [...await readTradeLogs(client, start, middle), ...await readTradeLogs(client, middle + 1, end)];
    }
    // Never substitute [] for an unreadable range or return credential-bearing RPC errors.
    throw new Error('Unable to read complete trade log range');
  }
}

function validBlock(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
function sameDecimal(left: unknown, right: string): boolean {
  const a = Number(left), b = Number(right);
  return Number.isFinite(a) && Math.abs(a - b) <= Math.max(Math.abs(b) * 1e-12, 1e-12);
}

export async function indexMeTokenTrades(options: TradeIndexerOptions = {}): Promise<TradeIndexerResult> {
  const dryRun = options.dryRun !== false;
  if (!dryRun && process.env.METOKEN_TRADE_INDEXER_ENABLED !== 'true') throw new Error('Trade indexer writes are disabled');
  const lookback = options.lookbackBlocks ?? DEFAULT_LOOKBACK_BLOCKS;
  if (!Number.isSafeInteger(lookback) || lookback <= 0 || lookback > MAX_INDEX_BLOCKS
    || (options.fromBlock != null && !validBlock(options.fromBlock)) || (options.toBlock != null && !validBlock(options.toBlock))) throw new Error('Invalid trade index window');
  const client = createIndexerClient();
  const finalized = await client.getBlock({ blockTag: 'finalized' });
  if (finalized.number == null) throw new Error('Finalized block unavailable');
  const finalBlock = Number(finalized.number);
  const toBlock = options.toBlock ?? finalBlock;
  const fromBlock = options.fromBlock ?? Math.max(0, toBlock - lookback + 1);
  if (!validBlock(finalBlock) || toBlock > finalBlock || fromBlock > toBlock || toBlock - fromBlock + 1 > MAX_INDEX_BLOCKS) throw new Error('Index only bounded finalized block windows');
  const result: TradeIndexerResult = { fromBlock, toBlock, blocksScanned: toBlock - fromBlock + 1, eventsFound: 0, inserted: 0, duplicatesSkipped: 0, unknownTokens: [], errors: [], insertedRows: [] };
  const unique = new Map<string, IndexedTrade>();
  for (let start = fromBlock; start <= toBlock; start += CHUNK_BLOCKS) {
    const logs = await readTradeLogs(client, start, Math.min(start + CHUNK_BLOCKS - 1, toBlock));
    for (const log of logs) {
      const trade = decodeTradeLog(log);
      if (trade && trade.blockNumber >= fromBlock && trade.blockNumber <= toBlock) unique.set(tradeEventId(trade.transactionHash, trade.logIndex), trade);
    }
  }
  const trades = [...unique.values()].sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
  result.eventsFound = trades.length;
  if (!trades.length) return result;
  const supabase = createServiceClient();
  const addresses = [...new Set(trades.map(trade => trade.meToken))];
  const { data: tokens, error: tokenError } = await supabase.from('metokens').select('id, address, hub_id').in('address', addresses);
  if (tokenError) throw new Error('Unable to load indexed token identities');
  const tokenMap = new Map((tokens ?? []).map(token => [String(token.address).toLowerCase(), token]));
  const hashes = [...new Set(trades.map(trade => trade.transactionHash))];
  type Existing = { id: string; metoken_id: string; transaction_hash: string; transaction_type: string; amount: unknown; collateral_amount: unknown; user_address: string };
  const existing: Existing[] = [];
  for (let offset = 0; offset < hashes.length; offset += 40) {
    for (let page = 0; ; page += 1000) {
      const { data, error } = await supabase.from('metoken_transactions').select('id, metoken_id, transaction_hash, transaction_type, amount, collateral_amount, user_address')
        .in('transaction_hash', hashes.slice(offset, offset + 40)).order('id').range(page, page + 999);
      if (error) throw new Error('Unable to load existing trade identities');
      existing.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
  }
  const canonicalIds = new Set(trades.map(trade => tradeEventId(trade.transactionHash, trade.logIndex)));
  const knownIds = new Set(existing.map(row => row.id));
  const claimedLegacy = new Set<string>();
  const timestamps = new Map<number, string>();
  const rows: Array<Record<string, unknown>> = [];
  for (const trade of trades) {
    const token = tokenMap.get(trade.meToken);
    if (!token) { result.unknownTokens.push(trade.meToken); continue; }
    const id = tradeEventId(trade.transactionHash, trade.logIndex);
    if (knownIds.has(id)) { result.duplicatesSkipped++; continue; }
    // Legacy UI rows have random ids and no log index. Match only exact token,
    // transaction, side, wallet and amounts; ambiguous groups require reconciliation.
    const legacy = existing.filter(row => !canonicalIds.has(row.id) && !claimedLegacy.has(row.id)
      && row.transaction_hash.toLowerCase() === trade.transactionHash && row.metoken_id === token.id && row.transaction_type === trade.type);
    const matches = legacy.filter(row => row.user_address.toLowerCase() === trade.userAddress && sameDecimal(row.amount, trade.amount) && sameDecimal(row.collateral_amount, trade.collateral));
    if (matches.length > 1 || (legacy.length && !matches.length)) throw new Error('Legacy trade rows require reconciliation before indexing this window');
    if (matches.length === 1) { claimedLegacy.add(matches[0].id); result.duplicatesSkipped++; continue; }
    if (!timestamps.has(trade.blockNumber)) {
      const block = await client.getBlock({ blockNumber: BigInt(trade.blockNumber) });
      if (!block.timestamp) throw new Error('Missing on-chain trade timestamp');
      timestamps.set(trade.blockNumber, new Date(Number(block.timestamp) * 1000).toISOString());
    }
    rows.push({ id, metoken_id: token.id, user_address: trade.userAddress, transaction_type: trade.type,
      amount: trade.amount, collateral_amount: trade.collateral, transaction_hash: trade.transactionHash,
      block_number: trade.blockNumber, created_at: timestamps.get(trade.blockNumber) });
    result.insertedRows.push(trade);
  }
  result.unknownTokens = [...new Set(result.unknownTokens)];
  if (dryRun) return result;
  if (rows.length) {
    // PK-backed upsert, rather than a check-then-insert race between cron workers.
    const { data: inserted, error } = await supabase.from('metoken_transactions').upsert(rows, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (error) throw new Error('Unable to persist indexed trade events');
    result.inserted = inserted?.length ?? 0;
  }
  // Retry market refreshes even when the previous run already committed every event.
  for (const address of new Set(trades.filter(trade => tokenMap.has(trade.meToken)).map(trade => trade.meToken))) {
    const synced = await syncMeTokenMarketData(address);
    if (!synced) result.errors.push('Post-trade market refresh pending for ' + address);
  }
  return result;
}
