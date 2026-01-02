import { customType, index, pgSchema, primaryKey, unique, } from "drizzle-orm/pg-core";
const nummultirange = customType({
    dataType() {
        return "nummultirange";
    },
});
const numeric78 = customType({
    dataType() {
        return "numeric(78,0)";
    },
    fromDriver(value) {
        return BigInt(value);
    },
});
/**
 * Database schemas for the sync.
 *
 * @dev The order of the schemas represents the order of the migrations.
 * @dev The schemas must match the files in "./sql".
 */
export const PONDER_SYNC_SCHEMAS = ["ponder_sync"];
/**
 * Latest database schema for the sync.
 */
export const PONDER_SYNC_SCHEMA = PONDER_SYNC_SCHEMAS[PONDER_SYNC_SCHEMAS.length - 1];
export const PONDER_SYNC = pgSchema(PONDER_SYNC_SCHEMA);
export const blocks = PONDER_SYNC.table("blocks", (t) => ({
    chainId: t.bigint({ mode: "bigint" }).notNull(),
    number: t.bigint({ mode: "bigint" }).notNull(),
    timestamp: t.bigint({ mode: "bigint" }).notNull(),
    hash: t.varchar({ length: 66 }).notNull().$type(),
    parentHash: t.varchar({ length: 66 }).notNull().$type(),
    logsBloom: t.varchar({ length: 514 }).notNull().$type(),
    miner: t.varchar({ length: 42 }).notNull().$type(),
    gasUsed: numeric78().notNull(),
    gasLimit: numeric78().notNull(),
    baseFeePerGas: numeric78(),
    nonce: t.varchar({ length: 18 }).$type(),
    mixHash: t.varchar({ length: 66 }).$type(),
    stateRoot: t.varchar({ length: 66 }).notNull().$type(),
    receiptsRoot: t.varchar({ length: 66 }).notNull().$type(),
    transactionsRoot: t.varchar({ length: 66 }).notNull().$type(),
    sha3Uncles: t.varchar({ length: 66 }).$type(),
    size: numeric78().notNull(),
    difficulty: numeric78().notNull(),
    totalDifficulty: numeric78(),
    extraData: t.text().notNull().$type(),
}), (table) => [
    primaryKey({
        name: "blocks_pkey",
        columns: [table.chainId, table.number],
    }),
]);
export const transactions = PONDER_SYNC.table("transactions", (t) => ({
    chainId: t.bigint({ mode: "bigint" }).notNull(),
    blockNumber: t.bigint({ mode: "bigint" }).notNull(),
    transactionIndex: t.integer().notNull(),
    hash: t.varchar({ length: 66 }).notNull().$type(),
    blockHash: t.varchar({ length: 66 }).notNull().$type(),
    from: t.varchar({ length: 42 }).notNull().$type(),
    to: t.varchar({ length: 42 }).$type(),
    input: t.text().notNull().$type(),
    value: numeric78().notNull(),
    nonce: t.integer().notNull(),
    r: t.varchar({ length: 66 }).$type(),
    s: t.varchar({ length: 66 }).$type(),
    v: numeric78(),
    type: t.text().notNull().$type(),
    gas: numeric78().notNull(),
    gasPrice: numeric78(),
    maxFeePerGas: numeric78(),
    maxPriorityFeePerGas: numeric78(),
    accessList: t.text(),
}), (table) => [
    primaryKey({
        name: "transactions_pkey",
        columns: [table.chainId, table.blockNumber, table.transactionIndex],
    }),
]);
export const transactionReceipts = PONDER_SYNC.table("transaction_receipts", (t) => ({
    chainId: t.bigint({ mode: "bigint" }).notNull(),
    blockNumber: t.bigint({ mode: "bigint" }).notNull(),
    transactionIndex: t.integer().notNull(),
    transactionHash: t.varchar({ length: 66 }).notNull().$type(),
    blockHash: t.varchar({ length: 66 }).notNull().$type(),
    from: t.varchar({ length: 42 }).notNull().$type(),
    to: t.varchar({ length: 42 }).$type(),
    contractAddress: t.varchar({ length: 42 }).$type(),
    logsBloom: t.varchar({ length: 514 }).notNull().$type(),
    gasUsed: numeric78().notNull(),
    cumulativeGasUsed: numeric78().notNull(),
    effectiveGasPrice: numeric78().notNull(),
    status: t.text().notNull().$type(),
    type: t.text().notNull().$type(),
}), (table) => [
    primaryKey({
        name: "transaction_receipts_pkey",
        columns: [table.chainId, table.blockNumber, table.transactionIndex],
    }),
]);
export const logs = PONDER_SYNC.table("logs", (t) => ({
    chainId: t.bigint({ mode: "bigint" }).notNull(),
    blockNumber: t.bigint({ mode: "bigint" }).notNull(),
    logIndex: t.integer().notNull(),
    transactionIndex: t.integer().notNull(),
    blockHash: t.varchar({ length: 66 }).notNull().$type(),
    transactionHash: t.varchar({ length: 66 }).notNull().$type(),
    address: t.varchar({ length: 42 }).notNull().$type(),
    topic0: t.varchar({ length: 66 }).$type(),
    topic1: t.varchar({ length: 66 }).$type(),
    topic2: t.varchar({ length: 66 }).$type(),
    topic3: t.varchar({ length: 66 }).$type(),
    data: t.text().notNull().$type(),
}), (table) => [
    primaryKey({
        name: "logs_pkey",
        columns: [table.chainId, table.blockNumber, table.logIndex],
    }),
]);
export const traces = PONDER_SYNC.table("traces", (t) => ({
    chainId: t.bigint({ mode: "bigint" }).notNull(),
    blockNumber: t.bigint({ mode: "bigint" }).notNull(),
    transactionIndex: t.integer().notNull(),
    traceIndex: t.integer().notNull(),
    from: t.varchar({ length: 42 }).notNull().$type(),
    to: t.varchar({ length: 42 }).$type(),
    input: t.text().notNull().$type(),
    output: t.text().$type(),
    value: numeric78(),
    type: t.text().notNull(),
    gas: numeric78().notNull(),
    gasUsed: numeric78().notNull(),
    error: t.text(),
    revertReason: t.text(),
    subcalls: t.integer().notNull(),
}), (table) => [
    primaryKey({
        name: "traces_pkey",
        columns: [
            table.chainId,
            table.blockNumber,
            table.transactionIndex,
            table.traceIndex,
        ],
    }),
]);
export const rpcRequestResults = PONDER_SYNC.table("rpc_request_results", (t) => ({
    requestHash: t.text().notNull(),
    chainId: t.bigint({ mode: "bigint" }).notNull(),
    blockNumber: t.bigint({ mode: "bigint" }),
    result: t.text().notNull(),
}), (table) => [
    primaryKey({
        name: "rpc_request_results_pkey",
        columns: [table.chainId, table.requestHash],
    }),
    index("rpc_request_results_chain_id_block_number_index").on(table.chainId, table.blockNumber),
]);
export const intervals = PONDER_SYNC.table("intervals", (t) => ({
    fragmentId: t.text().notNull().$type().primaryKey(),
    chainId: t.bigint({ mode: "bigint" }).notNull(),
    blocks: nummultirange().notNull(),
}));
export const factories = PONDER_SYNC.table("factories", (t) => ({
    id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
    factory: t
        .jsonb()
        .$type()
        .notNull(),
}), (table) => [
    index("factories_factory_idx").on(table.factory),
    unique("factories_factory_key").on(table.factory),
]);
export const factoryAddresses = PONDER_SYNC.table("factory_addresses", (t) => ({
    id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
    factoryId: t.integer().notNull(),
    chainId: t.bigint({ mode: "bigint" }).notNull(),
    blockNumber: t.bigint({ mode: "bigint" }).notNull(),
    address: t.text().$type().notNull(),
}), (table) => [index("factory_addresses_factory_id_index").on(table.factoryId)]);
//# sourceMappingURL=schema.js.map