import type { SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt } from '../internal/types.js';
import type * as ponderSyncSchema from "./schema.js";
export declare const encodeBlock: ({ block, chainId, }: {
    block: SyncBlock | SyncBlockHeader;
    chainId: number;
}) => typeof ponderSyncSchema.blocks.$inferInsert;
export declare const encodeLog: ({ log, chainId, }: {
    log: SyncLog;
    chainId: number;
}) => typeof ponderSyncSchema.logs.$inferInsert;
export declare const encodeTransaction: ({ transaction, chainId, }: {
    transaction: SyncTransaction;
    chainId: number;
}) => typeof ponderSyncSchema.transactions.$inferInsert;
export declare const encodeTransactionReceipt: ({ transactionReceipt, chainId, }: {
    transactionReceipt: SyncTransactionReceipt;
    chainId: number;
}) => typeof ponderSyncSchema.transactionReceipts.$inferInsert;
export declare const encodeTrace: ({ trace, block, transaction, chainId, }: {
    trace: SyncTrace;
    block: Pick<SyncBlock, "number">;
    transaction: Pick<SyncTransaction, "transactionIndex">;
    chainId: number;
}) => typeof ponderSyncSchema.traces.$inferInsert;
//# sourceMappingURL=encode.d.ts.map