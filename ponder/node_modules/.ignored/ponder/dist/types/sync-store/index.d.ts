import type { QB } from '../database/queryBuilder.js';
import type { Common } from '../internal/common.js';
import type { Logger } from '../internal/logger.js';
import type { BlockFilter, Factory, Filter, Fragment, InternalBlock, InternalLog, InternalTrace, InternalTransaction, InternalTransactionReceipt, LightBlock, LogFilter, SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, SyncTransactionReceipt, TraceFilter, TransactionFilter, TransferFilter } from '../internal/types.js';
import type { RequestParameters } from '../rpc/index.js';
import type { IntervalWithFactory, IntervalWithFilter } from '../runtime/index.js';
import type { Interval } from '../utils/interval.js';
import { type SQL } from "drizzle-orm";
import { type Address } from "viem";
import * as PONDER_SYNC from "./schema.js";
export type SyncStore = {
    insertIntervals(args: {
        intervals: IntervalWithFilter[];
        factoryIntervals: IntervalWithFactory[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    getIntervals(args: {
        filters: Filter[];
    }, context?: {
        logger?: Logger;
    }): Promise<Map<Filter | Factory, {
        fragment: Fragment;
        intervals: Interval[];
    }[]>>;
    insertChildAddresses(args: {
        factory: Factory;
        childAddresses: Map<Address, number>;
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    getChildAddresses(args: {
        factory: Factory;
    }, context?: {
        logger?: Logger;
    }): Promise<Map<Address, number>>;
    getSafeCrashRecoveryBlock(args: {
        chainId: number;
        timestamp: number;
    }, context?: {
        logger?: Logger;
    }): Promise<{
        number: bigint;
        timestamp: bigint;
    } | undefined>;
    insertLogs(args: {
        logs: SyncLog[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    insertBlocks(args: {
        blocks: (SyncBlock | SyncBlockHeader)[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    insertTransactions(args: {
        transactions: SyncTransaction[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    insertTransactionReceipts(args: {
        transactionReceipts: SyncTransactionReceipt[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    insertTraces(args: {
        traces: {
            trace: SyncTrace;
            block: SyncBlock;
            transaction: SyncTransaction;
        }[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    getEventData(args: {
        filters: Filter[];
        fromBlock: number;
        toBlock: number;
        chainId: number;
        limit: number;
    }, context?: {
        logger?: Logger;
    }): Promise<{
        blocks: InternalBlock[];
        logs: InternalLog[];
        transactions: InternalTransaction[];
        transactionReceipts: InternalTransactionReceipt[];
        traces: InternalTrace[];
        cursor: number;
    }>;
    insertRpcRequestResults(args: {
        requests: {
            request: RequestParameters;
            blockNumber: number | undefined;
            result: string;
        }[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    getRpcRequestResults(args: {
        requests: RequestParameters[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<(string | undefined)[]>;
    pruneRpcRequestResults(args: {
        blocks: Pick<LightBlock, "number">[];
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
    pruneByChain(args: {
        chainId: number;
    }, context?: {
        logger?: Logger;
    }): Promise<void>;
};
export declare const createSyncStore: ({ common, qb, }: {
    common: Common;
    qb: QB<typeof PONDER_SYNC>;
}) => SyncStore;
export declare const logFilter: (filter: LogFilter) => SQL;
export declare const blockFilter: (filter: BlockFilter) => SQL;
export declare const transactionFilter: (filter: TransactionFilter) => SQL;
export declare const transferFilter: (filter: TransferFilter) => SQL;
export declare const traceFilter: (filter: TraceFilter) => SQL;
//# sourceMappingURL=index.d.ts.map