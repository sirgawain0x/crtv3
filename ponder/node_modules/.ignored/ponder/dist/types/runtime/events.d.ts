import type { Common } from '../internal/common.js';
import type { Chain, Event, EventCallback, FactoryId, InternalBlock, InternalLog, InternalTrace, InternalTransaction, InternalTransactionReceipt, RawEvent, SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt } from '../internal/types.js';
import { type Address } from "viem";
/**
 * Create `RawEvent`s from raw data types
 */
export declare const buildEvents: ({ eventCallbacks, blocks, logs, transactions, transactionReceipts, traces, childAddresses, chainId, }: {
    eventCallbacks: EventCallback[];
    blocks: InternalBlock[];
    logs: InternalLog[];
    transactions: InternalTransaction[];
    transactionReceipts: InternalTransactionReceipt[];
    traces: InternalTrace[];
    childAddresses: Map<FactoryId, Map<Address, number>>;
    chainId: number;
}) => RawEvent[];
export declare const splitEvents: (events: Event[]) => {
    events: Event[];
    chainId: number;
    checkpoint: string;
}[];
export declare const decodeEvents: (common: Common, chain: Chain, eventCallbacks: EventCallback[], rawEvents: RawEvent[]) => Event[];
export declare const syncBlockToInternal: ({ block, }: {
    block: SyncBlock | SyncBlockHeader;
}) => InternalBlock;
export declare const syncLogToInternal: ({ log }: {
    log: SyncLog;
}) => InternalLog;
export declare const syncTransactionToInternal: ({ transaction, }: {
    transaction: SyncTransaction;
}) => InternalTransaction;
export declare const syncTransactionReceiptToInternal: ({ transactionReceipt, }: {
    transactionReceipt: SyncTransactionReceipt;
}) => InternalTransactionReceipt;
export declare const syncTraceToInternal: ({ trace, block, transaction, }: {
    trace: SyncTrace;
    block: Pick<SyncBlock, "number">;
    transaction: Pick<SyncTransaction, "transactionIndex">;
}) => InternalTrace;
//# sourceMappingURL=events.d.ts.map