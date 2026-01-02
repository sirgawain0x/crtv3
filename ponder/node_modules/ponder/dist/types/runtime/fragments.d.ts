import type { BlockFilter, Factory, Filter, Fragment, FragmentAddress, FragmentAddressId, FragmentId, LogFilter, TraceFilter, TransactionFilter, TransferFilter } from '../internal/types.js';
import type { Address } from "viem";
export declare const isFragmentAddressFactory: (fragmentAddress: FragmentAddress) => boolean;
type FragmentReturnType = {
    fragment: Fragment;
    adjacentIds: FragmentId[];
}[];
export declare const getFragments: (filter: Filter) => FragmentReturnType;
export declare const getFactoryFragments: (factory: Factory) => Fragment[];
export declare const getAddressFragments: (address: Address | Address[] | Factory | undefined) => {
    fragment: FragmentAddress;
    adjacentIds: FragmentAddressId[];
}[];
export declare const getBlockFilterFragment: ({ chainId, interval, offset, }: Omit<BlockFilter, "fromBlock" | "toBlock">) => FragmentReturnType;
export declare const getTransactionFilterFragments: ({ chainId, fromAddress, toAddress, }: Omit<TransactionFilter, "fromBlock" | "toBlock"> & {
    chainId: number;
}) => FragmentReturnType;
export declare const getTraceFilterFragments: ({ chainId, fromAddress, toAddress, callType, functionSelector, ...filter }: Omit<TraceFilter, "fromBlock" | "toBlock"> & {
    chainId: number;
}) => FragmentReturnType;
export declare const getLogFilterFragments: ({ chainId, address, topic0, topic1, topic2, topic3, ...filter }: Omit<LogFilter, "fromBlock" | "toBlock">) => FragmentReturnType;
export declare const getTransferFilterFragments: ({ chainId, fromAddress, toAddress, ...filter }: Omit<TransferFilter, "fromBlock" | "toBlock"> & {
    chainId: number;
}) => FragmentReturnType;
export declare const fragmentAddressToId: (fragmentAddress: FragmentAddress) => FragmentAddressId;
export declare const encodeFragment: (fragment: Fragment) => FragmentId;
export declare const decodeFragment: (fragmentId: FragmentId) => Fragment;
export declare const recoverFilter: (baseFilter: Filter, fragments: Fragment[]) => Filter;
export {};
//# sourceMappingURL=fragments.d.ts.map