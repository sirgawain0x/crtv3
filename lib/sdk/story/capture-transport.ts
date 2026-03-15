/**
 * Transport that captures eth_sendTransaction params instead of sending.
 * Used to get unsigned tx params for client-side signing (creator-as-deployer).
 */
import { http } from "viem";
import type { Address } from "viem";

export interface CapturedTx {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
  gas?: bigint;
  gasPrice?: bigint;
  chainId?: number;
}

const CAPTURED_TXS = new Map<string, CapturedTx[]>();
const FAKE_HASHES = new Map<string, string[]>();

/** Fake tx hash returned for captured txs so the SDK continues to the next call. */
function nextFakeHash(key: string): `0x${string}` {
  const list = FAKE_HASHES.get(key) ?? [];
  const hash = `0x${"0".repeat(63)}${list.length}` as `0x${string}`;
  list.push(hash);
  FAKE_HASHES.set(key, list);
  return hash;
}

/**
 * Create a transport that forwards RPC to the real URL except:
 * - eth_sendTransaction: capture params and return a fake hash so the SDK continues.
 * - eth_getTransactionReceipt for that fake hash: return a success receipt.
 * Use getCapturedTxs(key) after the SDK flow completes to get all captured txs.
 */
export function createCaptureTransport(rpcUrl: string, captureKey: string) {
  const base = http(rpcUrl);
  return (opts: any) => {
    const transportInstance = base(opts);
    const originalRequest = transportInstance.request?.bind(transportInstance) ?? transportInstance.request;
    return {
      ...transportInstance,
      request: async (args: { method?: string; params?: unknown[]; id?: number }) => {
        const method = args.method ?? (args as any).method;
        const params = args.params ?? (args as any).params ?? [];
        const id = args.id ?? (args as any).id ?? 1;
        if (method === "eth_sendTransaction" && Array.isArray(params) && params[0]) {
          const tx = params[0] as Record<string, unknown>;
          const captured: CapturedTx = {
            to: tx.to as Address,
            data: (tx.data as `0x${string}`) ?? "0x",
            value: tx.value != null ? BigInt(tx.value as string | number) : undefined,
            gas: tx.gas != null ? BigInt(tx.gas as string | number) : undefined,
            gasPrice: tx.gasPrice != null ? BigInt(tx.gasPrice as string | number) : undefined,
            chainId: tx.chainId != null ? Number(tx.chainId) : undefined,
          };
          const list = CAPTURED_TXS.get(captureKey) ?? [];
          list.push(captured);
          CAPTURED_TXS.set(captureKey, list);
          const fakeHash = nextFakeHash(captureKey);
          return fakeHash;
        }
        if (method === "eth_getTransactionReceipt" && Array.isArray(params) && params[0]) {
          const hashes = FAKE_HASHES.get(captureKey) ?? [];
          if (hashes.includes(params[0] as string)) {
            return {
              status: "0x1",
              transactionHash: params[0],
              blockNumber: "0x1",
              blockHash: "0x" + "0".repeat(64),
              transactionIndex: "0x0",
              from: "0x" + "0".repeat(40),
              to: "0x" + "0".repeat(40),
              gasUsed: "0x5208",
              cumulativeGasUsed: "0x5208",
              logs: [],
              logsBloom: "0x" + "0".repeat(512),
            };
          }
        }
        const requestArgs = { method: method ?? "eth_call", params };
        return originalRequest(requestArgs);
      },
    };
  };
}

export class CaptureTxError extends Error {
  constructor(public readonly captureKey: string, message: string) {
    super(message);
    this.name = "CaptureTxError";
  }
}

export function getCapturedTxs(key: string): CapturedTx[] {
  const txs = CAPTURED_TXS.get(key) ?? [];
  CAPTURED_TXS.delete(key);
  FAKE_HASHES.delete(key);
  return txs;
}

export function clearCapturedTxs(key: string): void {
  CAPTURED_TXS.delete(key);
}
