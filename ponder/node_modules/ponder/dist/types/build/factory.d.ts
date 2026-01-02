import type { LogFactory } from '../internal/types.js';
import type { AbiEvent } from "abitype";
import { type Address } from "viem";
export declare function buildLogFactory({ address: _address, event, parameter, chainId, sourceId, fromBlock, toBlock, }: {
    address?: Address | readonly Address[];
    event: AbiEvent;
    parameter: string;
    chainId: number;
    sourceId: string;
    fromBlock: number | undefined;
    toBlock: number | undefined;
}): LogFactory;
//# sourceMappingURL=factory.d.ts.map