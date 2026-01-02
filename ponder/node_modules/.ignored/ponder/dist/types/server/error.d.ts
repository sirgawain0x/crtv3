import type { Common } from '../internal/common.js';
import type { Context } from "hono";
export declare const onError: (_error: Error, c: Context, common: Common) => Promise<Response & import("hono").TypedResponse<`${string}: ${string} occurred in 'undefined' while handling a '${string}' request to the route '${string}'` | `${string}: ${string} occurred in '${string}' while handling a '${string}' request to the route '${string}'`, 500, "text">>;
export declare const onNotFound: (c: Context) => Response | Promise<Response>;
//# sourceMappingURL=error.d.ts.map