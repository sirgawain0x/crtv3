import type { Common } from '../internal/common.js';
import type { Chain } from '../internal/types.js';
import { type HttpRequestParameters, type HttpRequestReturnType, type HttpRpcClientOptions } from "viem/utils";
export type RpcRequest = {
    jsonrpc?: "2.0" | undefined;
    method: string;
    params?: any | undefined;
    id?: number | undefined;
};
export type HttpRpcClient = {
    request<body extends RpcRequest>(params: HttpRequestParameters<body>): Promise<HttpRequestReturnType<body>>;
};
export declare function getHttpRpcClient(url: string, options: HttpRpcClientOptions & {
    common: Common;
    chain: Chain;
}): HttpRpcClient;
//# sourceMappingURL=http.d.ts.map