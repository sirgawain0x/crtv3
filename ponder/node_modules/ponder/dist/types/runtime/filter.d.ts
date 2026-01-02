import type { BlockFilter, Factory, Filter, InternalBlock, InternalLog, InternalTrace, InternalTransaction, LogFactory, LogFilter, RequiredBlockColumns, RequiredLogColumns, RequiredTraceColumns, RequiredTransactionColumns, RequiredTransactionReceiptColumns, SyncBlock, SyncBlockHeader, SyncLog, SyncTrace, SyncTransaction, TraceFilter, TransactionFilter, TransferFilter } from '../internal/types.js';
import type { Block, Log, Trace, Transaction, TransactionReceipt } from '../types/eth.js';
import { type Address } from "viem";
/** Returns true if `address` is an address filter. */
export declare const isAddressFactory: (address: Address | Address[] | Factory | undefined | null) => address is LogFactory;
export declare const getChildAddress: ({ log, factory, }: {
    log: SyncLog;
    factory: Factory;
}) => Address;
export declare const isAddressMatched: ({ address, blockNumber, childAddresses, }: {
    address: Address | undefined;
    blockNumber: number;
    childAddresses: Map<Address, number>;
}) => boolean;
/**
 * Returns `true` if `log` matches `factory`
 */
export declare const isLogFactoryMatched: ({ factory, log, }: {
    factory: LogFactory;
    log: InternalLog | SyncLog;
}) => boolean;
/**
 * Returns `true` if `log` matches `filter`
 */
export declare const isLogFilterMatched: ({ filter, log, }: {
    filter: LogFilter;
    log: InternalLog | SyncLog;
}) => boolean;
/**
 * Returns `true` if `transaction` matches `filter`
 */
export declare const isTransactionFilterMatched: ({ filter, transaction, }: {
    filter: TransactionFilter;
    transaction: InternalTransaction | SyncTransaction;
}) => boolean;
/**
 * Returns `true` if `trace` matches `filter`
 */
export declare const isTraceFilterMatched: ({ filter, trace, block, }: {
    filter: TraceFilter;
    trace: InternalTrace | SyncTrace["trace"];
    block: Pick<InternalBlock | SyncBlock, "number">;
}) => boolean;
/**
 * Returns `true` if `trace` matches `filter`
 */
export declare const isTransferFilterMatched: ({ filter, trace, block, }: {
    filter: TransferFilter;
    trace: InternalTrace | SyncTrace["trace"];
    block: Pick<InternalBlock | SyncBlock, "number">;
}) => boolean;
/**
 * Returns `true` if `block` matches `filter`
 */
export declare const isBlockFilterMatched: ({ filter, block, }: {
    filter: BlockFilter;
    block: Pick<InternalBlock | SyncBlock | SyncBlockHeader, "number">;
}) => boolean;
export declare const getFilterFactories: (filter: Filter) => Factory[];
export declare const getFilterFromBlock: (filter: Filter) => number;
export declare const getFilterToBlock: (filter: Filter) => number;
export declare const isBlockInFilter: (filter: Filter, blockNumber: number) => boolean;
export declare const defaultBlockInclude: (keyof Block)[];
export declare const requiredBlockInclude: RequiredBlockColumns[];
export declare const defaultTransactionInclude: (keyof Transaction)[];
export declare const requiredTransactionInclude: RequiredTransactionColumns[];
export declare const defaultTransactionReceiptInclude: (keyof TransactionReceipt)[];
export declare const requiredTransactionReceiptInclude: RequiredTransactionReceiptColumns[];
export declare const defaultTraceInclude: (keyof Trace)[];
export declare const requiredTraceInclude: RequiredTraceColumns[];
export declare const defaultLogInclude: (keyof Log)[];
export declare const requiredLogInclude: RequiredLogColumns[];
export declare const defaultBlockFilterInclude: BlockFilter["include"];
export declare const requiredBlockFilterInclude: BlockFilter["include"];
export declare const defaultLogFilterInclude: LogFilter["include"];
export declare const requiredLogFilterInclude: LogFilter["include"];
export declare const defaultTransactionFilterInclude: TransactionFilter["include"];
export declare const requiredTransactionFilterInclude: TransactionFilter["include"];
export declare const defaultTraceFilterInclude: TraceFilter["include"];
export declare const requiredTraceFilterInclude: TraceFilter["include"];
export declare const defaultTransferFilterInclude: TransferFilter["include"];
export declare const requiredTransferFilterInclude: TransferFilter["include"];
export declare const unionFilterIncludeBlock: (filters: Filter[]) => (keyof Block)[];
export declare const unionFilterIncludeTransaction: (filters: Filter[]) => (keyof Transaction)[];
export declare const unionFilterIncludeTransactionReceipt: (filters: Filter[]) => (keyof TransactionReceipt)[];
export declare const unionFilterIncludeTrace: (filters: Filter[]) => (keyof Trace)[];
//# sourceMappingURL=filter.d.ts.map