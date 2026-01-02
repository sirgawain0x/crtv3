---
trigger: model_decision
description: Single Chain Configuration for Ponder.sh
---

# Chains [Configure chain IDs and RPC endpoints]

Use the `chains` field in `ponder.config.ts` to configure chain IDs and names, RPC endpoints, and connection options.

This guide describes each configuration option and suggests patterns for common use cases. Visit the config [API reference](/docs/api-reference/ponder/config) for more information.

## Example

This config sets up two chains: Ethereum mainnet and Optimism.

```ts [ponder.config.ts]
import { createConfig } from "ponder";

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: process.env.PONDER_RPC_URL_1,
    },
    optimism: {
      id: 10,
      rpc: [
        process.env.PONDER_RPC_URL_10,
        "https://optimism.llamarpc.com",
      ],
    },
  },
  contracts: { /* ... */ },
});
```

## Name

Each chain must have a unique name, provided as a key to the `chains` object. The contract, account, and block interval `chain` options reference the chain name.

Within indexing functions, the `context.chain.name` property contains the chain name of the current event.

```ts [ponder.config.ts]
import { createConfig } from "ponder";

export default createConfig({
  chains: {
    mainnet: { // [!code focus]
      id: 1,
      rpc: process.env.PONDER_RPC_URL_1,
    },
  },
  contracts: {
    Blitmap: {
      abi: BlitmapAbi,
      chain: "mainnet", // [!code focus]
      address: "0x8d04a8c79cEB0889Bdd12acdF3Fa9D207eD3Ff63",
    },
  },
});
```

## Chain ID

Use the `id` field to specify a unique [Chain ID](https://chainlist.org) for each chain. Within indexing functions, the `context.chain.id` property contains the chain ID of the current event.

The indexing engine uses `id` in the cache key for RPC responses. To avoid cache issues, make sure `id` always matches the chain ID of the configured RPC endpoint.

```ts [ponder.config.ts]
import { createConfig } from "ponder";

export default createConfig({
  chains: {
    mainnet: {
      id: 1, // [!code focus]
      rpc: "https://eth.llamarpc.com",
    },
  },
  contracts: { /* ... */ },
});
```

:::info
  Ponder does not support chain IDs greater than JavaScript's `Number.MAX_SAFE_INTEGER` (9007199254740991).
:::

## RPC endpoints

:::warning
  Most Ponder apps require a paid RPC provider plan to avoid rate-limiting.
:::

Use the `rpc` field to provide one or more RPC endpoints for each chain.

Ponder dynamically adapts to provider rate limits to avoid 429 errors and maximize performance. Providing multiple endpoints enables intelligent load balancing and fallback logic to improve reliability.

```ts [ponder.config.ts]
import { createConfig } from "ponder";

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: "https://eth-mainnet.g.alchemy.com/v2/...", // [!code focus]
    },
  },
  contracts: { /* ... */ },
});
```

### Custom transport

The `rpc` field also accepts a [Viem Transport](https://viem.sh/docs/clients/intro#transports), which can be useful if you need more granular control over how RPC requests are made.

```ts [ponder.config.ts]
import { createConfig } from "ponder";
import { http, fallback } from "viem"; // [!code focus]

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: fallback([ // [!code focus]
        http("https://eth-mainnet.g.alchemy.com/v2/..."), // [!code focus]
        http("https://quaint-large-card.quiknode.pro/..."), // [!code focus]
      ]), // [!code focus]
    },
  },
});
```

Here are a few common transport options.

* [`http`](https://viem.sh/docs/clients/transports/http)
* [`webSocket`](https://viem.sh/docs/clients/transports/websocket)
* [`fallback`](https://viem.sh/docs/clients/transports/fallback)
* [`loadBalance`](/docs/api-reference/ponder-utils#loadbalance)
* [`rateLimit`](/docs/api-reference/ponder-utils#ratelimit)

## WebSocket

Use the optional `ws` field to specify a WebSocket RPC endpoint for each chain.

When provided, Ponder will use WebSocket connections for realtime block subscriptions instead of polling. Websocket connections typically offer lower latency and reduced RPC usage.

:::info
  If the WebSocket connection becomes unstable or fails, Ponder automatically falls back to the default polling mechanism to ensure continuous indexing.
:::

```ts [ponder.config.ts]
import { createConfig } from "ponder";

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: "https://eth-mainnet.g.alchemy.com/v2/...",
      ws: "wss://eth-mainnet.g.alchemy.com/v2/...", // [!code focus]
    },
  },
  contracts: { /* ... */ },
});
```

## Polling interval

The `pollingInterval` option controls how frequently (in milliseconds) the indexing engine checks for a new block in realtime. The default is `1000` (1 second).

If you set `pollingInterval` greater than the chain's block time, it **does not reduce RPC usage**. The indexing engine still fetches every block to check for reorgs. The default is suitable for most chains.

```ts [ponder.config.ts]
import { createConfig } from "ponder";

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: process.env.PONDER_RPC_URL_1,
      pollingInterval: 2_000, // 2 seconds [!code focus]
    },
  },
});
```

## Disable caching

Use the `disableCache` option to disable caching for RPC responses. The default is `false`.

Set this option to `true` when indexing a development node like Anvil, where the chain state / history may change. [Read more](/docs/guides/foundry) about indexing Anvil.

```ts [ponder.config.ts]
import { createConfig } from "ponder";

export default createConfig({
  chains: {
    anvil: {
      id: 31337,
      rpc: "http://127.0.0.1:8545",
      disableCache: true, // [!code focus]
    },
  },
});
```

## `eth_getLogs` block range

Ponder does its best to automatically determine the maximum block range for JSON-RPC requests with the `eth_getLogs` method. When this comes up short, you can set a manual limit with `ethGetLogsBlockRange` option. 

```ts [ponder.config.ts]
import { createConfig } from "ponder";

export default createConfig({
  chains: {
    mainnet: {
      id: 1,
      rpc: "https://eth-mainnet.g.alchemy.com/v2/...",
      ethGetLogsBlockRange: 1000, // [!code focus]
    },
  },
});
```
# Contracts [Index events emitted by a contract]

To index **event logs** or **call traces** produced by a contract, use the `contracts` field in `ponder.config.ts`.

This guide describes each configuration option and suggests patterns for common use cases. Visit the config [API reference](/docs/api-reference/ponder/config) for more information.

## Example

This config instructs the indexing engine to fetch event logs emitted by the [Blitmap](https://blitmap.xyz/) NFT contract.

```ts [ponder.config.ts]
import { createConfig } from "ponder";
import { BlitmapAbi } from "./abis/Blitmap";

export default createConfig({
  chains: {
    mainnet: { id: 1, rpc: process.env.PONDER_RPC_URL_1 },
  },
  contracts: {
    Blitmap: {
      abi: BlitmapAbi,
      chain: "mainnet",
      address: "0x8d04a8c79cEB0889Bdd12acdF3Fa9D207eD3Ff63",
      startBlock: 12439123,
    },
  },
});
```

Now, we can register an indexing function for the `MetadataChanged` event that will be called for each event log. In this case, the indexing function inserts or updates a row in the `tokens` table.

```ts [src/index.ts]
import { ponder } from "ponder:registry";
import { tokens } from "ponder:schema";

ponder.on("Blitmap:MetadataChanged", async ({ event, context }) => {
  await context.db
    .insert(tokens)
    .values({
      id: event.args.tokenId,
      metadata: event.args.newMetadata,
    })
    .onConflictDoUpdate({
      metadata: event.args.newMetadata,
    });
});
```

[Read more](/docs/indexing/overview) about writing indexing functions.

## Name

Each contract must have a unique name, provided as a key to the `contracts` object. Names must be unique across contracts, accounts, and block intervals.

```ts [ponder.config.ts]
import { createConfig } from "ponder";
import { BlitmapAbi } from "./abis/Blitmap";

export default createConfig({
  chains: { /* ... */ },
  contracts: {
    Blitmap: { // [!code focus]
      abi: BlitmapAbi,
      chain: "mainnet",
      address: "0x8d04a8c79cEB0889Bdd12acdF3Fa9D207eD3Ff63",
    },
  },
});
```

## ABI

Each contract must have an ABI. The indexing engine uses the ABI to validate inputs and encode & decode contract data.

```ts [ponder.config.ts]
import { createConfig } from "ponder";
import { BlitmapAbi } from "./abis/Blitmap"; 

export default createConfig({
  chains: {
    mainnet: { id: 1, rpc: process.env.PONDER_RPC_URL_1 },
  },
  contracts: {
    Blitmap: {
      abi: BlitmapAbi,
      chain: "mainnet",
      address: "0x8d04a8c79cEB0889Bdd12acdF3Fa9D207eD3Ff63",
      startBlock: 
    },
  },
});
```

To enable the type system, save all ABIs in `.ts` files and include an `as const{:ts}` assertion. Read more about these requirements in the [ABIType](https://abitype.dev/guide/getting-started#usage) documentation.

```ts [abis/Blitmap.ts]
export const BlitmapAbi = [ // [!code focus]
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // ...
] as const; // [!code focus]
```

### Multiple ABIs

Use the [`mergeAbis`](/docs/api-reference/ponder-utils#mergeabis) utility function to combine multiple ABIs into one. This function removes duplicate ABI items and maintains strict types.

This pattern is often useful for proxy contracts where the implementation ABI has changed over time.

```ts [ponder.config.ts]
import { createConfig, mergeAbis } from "ponder"; // [!code focus]
import { ERC1967ProxyAbi } from "./abis/ERC1967Proxy";
import { NameRegistryAbi } from "./abis/NameRegistry";
import { NameRegistry2Abi } from "./abis/NameRegistry2";

export default createConfig({
  chains: { /* ... */ },
  contracts: {
    FarcasterNameRegistry: {
      abi: mergeAbis([ERC1967ProxyAbi, NameRegistryAbi, NameRegistry2Abi]), // [!code focus]
      chain: "goerli",
      address: "0xe3Be01D99bAa8dB9905b33a3cA391238234B79D1",
    },
  },
});
```

## Chain

### Single chain

To index a contract on a single chain, pass the chain name as a string to the `chain` field.

```ts [ponder.config.ts]
import { createConfig } from "ponder";
import { BlitmapAbi } from "./abis/Blitmap";

export default createConfig({
  chains: {
    mainnet: { id: 1, rpc: process.env.PONDER_RPC_URL_1 }, // [!code focus]
  },
  contracts: {
    Blitmap: {
      abi: BlitmapAbi,
      chain: "mainnet", // [!code focus]
      address: "0x8d04a8c79cEB0889Bdd12acdF3Fa9D207eD3Ff63",
    },
  },
});
```

