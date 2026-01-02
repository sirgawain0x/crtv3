import { URL } from "node:url";
import { HttpRequestError, RpcRequestError, TimeoutError } from "viem";
import { stringify, } from "viem/utils";
export function getHttpRpcClient(url, options) {
    const { common, chain } = options;
    const timeoutMs = options?.timeout ?? 10000;
    let id = 1;
    return {
        async request(params) {
            // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
            return new Promise(async (resolve, reject) => {
                let isTimeoutRejected = false;
                const { body } = params;
                const fetchOptions = {
                    ...(params.fetchOptions ?? {}),
                };
                const { headers, method } = fetchOptions;
                let reader;
                const controller = new AbortController();
                const timeoutId = setTimeout(async () => {
                    isTimeoutRejected = true;
                    controller.abort();
                    reject(new TimeoutError({ body, url }));
                    if (reader) {
                        common.logger.warn({
                            msg: "JSON-RPC request timed out reading response body",
                            chain: chain.name,
                            chain_id: chain.id,
                            hostname: new URL(url).hostname,
                            // @ts-ignore
                            request_id: headers ? headers["X-Request-ID"] : undefined,
                            method: body.method,
                            request: JSON.stringify(body),
                            duration: timeoutMs,
                        });
                        try {
                            await reader.cancel("Timeout");
                        }
                        catch { }
                    }
                }, timeoutMs);
                try {
                    const init = {
                        body: stringify({
                            jsonrpc: "2.0",
                            id: body.id ?? id++,
                            ...body,
                        }),
                        headers: {
                            "Content-Type": "application/json",
                            ...headers,
                        },
                        method: method || "POST",
                        signal: controller.signal,
                    };
                    const request = new Request(url, init);
                    const response = await fetch(request);
                    reader = response.body?.getReader();
                    const chunks = [];
                    let totalLength = 0;
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done)
                                break;
                            chunks.push(value);
                            totalLength += value.length;
                        }
                    }
                    finally {
                        reader.releaseLock();
                        reader = undefined;
                    }
                    if (isTimeoutRejected)
                        return;
                    let offset = 0;
                    const fullData = new Uint8Array(totalLength);
                    for (const chunk of chunks) {
                        fullData.set(chunk, offset);
                        offset += chunk.length;
                    }
                    const text = new TextDecoder().decode(fullData);
                    let data = text;
                    try {
                        data = JSON.parse(data || "{}");
                    }
                    catch (err) {
                        if (response.ok)
                            throw err;
                        data = { error: data };
                    }
                    clearTimeout(timeoutId);
                    if (!response.ok) {
                        reject(new HttpRequestError({
                            body,
                            details: stringify(data.error) || response.statusText,
                            headers: response.headers,
                            status: response.status,
                            url,
                        }));
                        return;
                    }
                    if (data.error) {
                        reject(new RpcRequestError({
                            body,
                            error: data.error,
                            url: url,
                        }));
                    }
                    else {
                        resolve(data.result);
                    }
                }
                catch (_error) {
                    const error = _error;
                    clearTimeout(timeoutId);
                    if (isTimeoutRejected)
                        return;
                    if (error.name === "AbortError") {
                        reject(new TimeoutError({ body, url }));
                    }
                    if (error instanceof HttpRequestError)
                        reject(error);
                    reject(new HttpRequestError({ body, cause: error, url }));
                }
            });
        },
    };
}
//# sourceMappingURL=http.js.map