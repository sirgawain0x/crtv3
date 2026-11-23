import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodePacked, keccak256, type PublicClient } from 'viem';
const mocks = vi.hoisted(() => ({ question: vi.fn(), indexed: vi.fn() }));
vi.mock('./reality-eth-client', () => ({
  getRealityEthContract: () => ({ read: { questions: mocks.question } }),
  getRealityEthContractAddress: () => '0x0000000000000000000000000000000000000001',
  getRealityEthABI: () => [],
}));
vi.mock('./reality-eth-utils', () => { throw new Error('Write-only DOM formatter must not load during question reads'); });
vi.mock('@/lib/subgraph/query-reality-eth-subgraph', () => ({ queryRealityEthSubgraph: mocks.indexed }));
vi.mock('@/lib/utils/logger', () => ({ serverLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
import { getQuestion } from './reality-eth-question-wrapper';
const id = '0x' + 'a'.repeat(64);
const zero = '0x' + '0'.repeat(64);
const text = 'Will it ship?\u241fgeneral\u241fen_US';
const hash = keccak256(encodePacked(['uint256', 'uint32', 'string'], [0n, 100, text]));
const getLogs = vi.fn();
const getBlockNumber = vi.fn();
const client = { getLogs, getBlockNumber } as unknown as PublicClient;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.question.mockResolvedValue([hash, '0x' + '0'.repeat(40), 100n, 1000n, 200n, false, 42n, zero, zero, 0n, 0n]);
  mocks.indexed.mockResolvedValue({ question: { id, question: text, template_id: '0' } });
  getBlockNumber.mockResolvedValue(100n);
  getLogs.mockResolvedValue([]);
});
describe('prediction text recovery without historical scans', () => {
  it('uses hash-verified indexed text and preserves authoritative chain state', async () => {
    const result = await getQuestion(client, id);
    expect(result).toMatchObject({ question: text, template_id: 0n, bounty: 42n, best_answer: zero });
    expect(getLogs).not.toHaveBeenCalled();
    expect(getBlockNumber).not.toHaveBeenCalled();
  });
  it('rejects tampered indexed text and bounds new-question fallback to ten blocks', async () => {
    mocks.indexed.mockResolvedValue({ question: { id, question: 'Tampered', template_id: '0' } });
    getLogs.mockResolvedValue([{ args: { question: text, template_id: 0n } }]);
    expect((await getQuestion(client, id)).question).toBe(text);
    expect(getLogs).toHaveBeenCalledOnce();
    expect(getLogs).toHaveBeenCalledWith(expect.objectContaining({ fromBlock: 91n, toBlock: 100n }));
  });
  it('does not use metadata for another question', async () => {
    mocks.indexed.mockResolvedValue({ question: { id: '0xwrong', question: text, template_id: '0' } });
    expect((await getQuestion(client, id)).question).toBe('');
  });
  it('retains chain state when index and recent logs fail, without a synthetic error title', async () => {
    mocks.indexed.mockRejectedValue(new Error('Unavailable'));
    getLogs.mockRejectedValue(new Error('RPC range rejected'));
    expect(await getQuestion(client, id)).toMatchObject({ question: '', bounty: 42n });
    expect(getLogs).toHaveBeenCalledTimes(1);
  });
  it('also validates fallback event text against the on-chain content hash', async () => {
    mocks.indexed.mockResolvedValue(null);
    getLogs.mockResolvedValue([{ args: { question: 'Tampered', template_id: 0n } }]);
    expect((await getQuestion(client, id)).question).toBe('');
  });
});
