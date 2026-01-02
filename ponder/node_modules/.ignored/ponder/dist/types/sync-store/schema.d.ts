import type { FragmentId } from '../internal/types.js';
/**
 * Database schemas for the sync.
 *
 * @dev The order of the schemas represents the order of the migrations.
 * @dev The schemas must match the files in "./sql".
 */
export declare const PONDER_SYNC_SCHEMAS: readonly ["ponder_sync"];
/**
 * Latest database schema for the sync.
 */
export declare const PONDER_SYNC_SCHEMA: "ponder_sync";
export declare const PONDER_SYNC: import("drizzle-orm/pg-core").PgSchema<"ponder_sync">;
export declare const blocks: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "blocks";
    schema: "ponder_sync";
    columns: {
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "blocks";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        number: import("drizzle-orm/pg-core").PgColumn<{
            name: "number";
            tableName: "blocks";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        timestamp: import("drizzle-orm/pg-core").PgColumn<{
            name: "timestamp";
            tableName: "blocks";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        hash: import("drizzle-orm/pg-core").PgColumn<{
            name: "hash";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        parentHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "parentHash";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        logsBloom: import("drizzle-orm/pg-core").PgColumn<{
            name: "logsBloom";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 514;
            $type: `0x${string}`;
        }>;
        miner: import("drizzle-orm/pg-core").PgColumn<{
            name: "miner";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        gasUsed: import("drizzle-orm/pg-core").PgColumn<{
            name: "gasUsed";
            tableName: "blocks";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        gasLimit: import("drizzle-orm/pg-core").PgColumn<{
            name: "gasLimit";
            tableName: "blocks";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        baseFeePerGas: import("drizzle-orm/pg-core").PgColumn<{
            name: "baseFeePerGas";
            tableName: "blocks";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        nonce: import("drizzle-orm/pg-core").PgColumn<{
            name: "nonce";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 18;
            $type: `0x${string}`;
        }>;
        mixHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "mixHash";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        stateRoot: import("drizzle-orm/pg-core").PgColumn<{
            name: "stateRoot";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        receiptsRoot: import("drizzle-orm/pg-core").PgColumn<{
            name: "receiptsRoot";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        transactionsRoot: import("drizzle-orm/pg-core").PgColumn<{
            name: "transactionsRoot";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        sha3Uncles: import("drizzle-orm/pg-core").PgColumn<{
            name: "sha3Uncles";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        size: import("drizzle-orm/pg-core").PgColumn<{
            name: "size";
            tableName: "blocks";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        difficulty: import("drizzle-orm/pg-core").PgColumn<{
            name: "difficulty";
            tableName: "blocks";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        totalDifficulty: import("drizzle-orm/pg-core").PgColumn<{
            name: "totalDifficulty";
            tableName: "blocks";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        extraData: import("drizzle-orm/pg-core").PgColumn<{
            name: "extraData";
            tableName: "blocks";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
    };
    dialect: "pg";
}>;
export declare const transactions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "transactions";
    schema: "ponder_sync";
    columns: {
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "transactions";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blockNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockNumber";
            tableName: "transactions";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        transactionIndex: import("drizzle-orm/pg-core").PgColumn<{
            name: "transactionIndex";
            tableName: "transactions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        hash: import("drizzle-orm/pg-core").PgColumn<{
            name: "hash";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        blockHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockHash";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        from: import("drizzle-orm/pg-core").PgColumn<{
            name: "from";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        to: import("drizzle-orm/pg-core").PgColumn<{
            name: "to";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        input: import("drizzle-orm/pg-core").PgColumn<{
            name: "input";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
        value: import("drizzle-orm/pg-core").PgColumn<{
            name: "value";
            tableName: "transactions";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        nonce: import("drizzle-orm/pg-core").PgColumn<{
            name: "nonce";
            tableName: "transactions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        r: import("drizzle-orm/pg-core").PgColumn<{
            name: "r";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        s: import("drizzle-orm/pg-core").PgColumn<{
            name: "s";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        v: import("drizzle-orm/pg-core").PgColumn<{
            name: "v";
            tableName: "transactions";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
        gas: import("drizzle-orm/pg-core").PgColumn<{
            name: "gas";
            tableName: "transactions";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        gasPrice: import("drizzle-orm/pg-core").PgColumn<{
            name: "gasPrice";
            tableName: "transactions";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        maxFeePerGas: import("drizzle-orm/pg-core").PgColumn<{
            name: "maxFeePerGas";
            tableName: "transactions";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        maxPriorityFeePerGas: import("drizzle-orm/pg-core").PgColumn<{
            name: "maxPriorityFeePerGas";
            tableName: "transactions";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        accessList: import("drizzle-orm/pg-core").PgColumn<{
            name: "accessList";
            tableName: "transactions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const transactionReceipts: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "transaction_receipts";
    schema: "ponder_sync";
    columns: {
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "transaction_receipts";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blockNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockNumber";
            tableName: "transaction_receipts";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        transactionIndex: import("drizzle-orm/pg-core").PgColumn<{
            name: "transactionIndex";
            tableName: "transaction_receipts";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        transactionHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "transactionHash";
            tableName: "transaction_receipts";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        blockHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockHash";
            tableName: "transaction_receipts";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        from: import("drizzle-orm/pg-core").PgColumn<{
            name: "from";
            tableName: "transaction_receipts";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        to: import("drizzle-orm/pg-core").PgColumn<{
            name: "to";
            tableName: "transaction_receipts";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        contractAddress: import("drizzle-orm/pg-core").PgColumn<{
            name: "contractAddress";
            tableName: "transaction_receipts";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        logsBloom: import("drizzle-orm/pg-core").PgColumn<{
            name: "logsBloom";
            tableName: "transaction_receipts";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 514;
            $type: `0x${string}`;
        }>;
        gasUsed: import("drizzle-orm/pg-core").PgColumn<{
            name: "gasUsed";
            tableName: "transaction_receipts";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        cumulativeGasUsed: import("drizzle-orm/pg-core").PgColumn<{
            name: "cumulativeGasUsed";
            tableName: "transaction_receipts";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        effectiveGasPrice: import("drizzle-orm/pg-core").PgColumn<{
            name: "effectiveGasPrice";
            tableName: "transaction_receipts";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "transaction_receipts";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "transaction_receipts";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
    };
    dialect: "pg";
}>;
export declare const logs: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "logs";
    schema: "ponder_sync";
    columns: {
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "logs";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blockNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockNumber";
            tableName: "logs";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        logIndex: import("drizzle-orm/pg-core").PgColumn<{
            name: "logIndex";
            tableName: "logs";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        transactionIndex: import("drizzle-orm/pg-core").PgColumn<{
            name: "transactionIndex";
            tableName: "logs";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blockHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockHash";
            tableName: "logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        transactionHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "transactionHash";
            tableName: "logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        address: import("drizzle-orm/pg-core").PgColumn<{
            name: "address";
            tableName: "logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        topic0: import("drizzle-orm/pg-core").PgColumn<{
            name: "topic0";
            tableName: "logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        topic1: import("drizzle-orm/pg-core").PgColumn<{
            name: "topic1";
            tableName: "logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        topic2: import("drizzle-orm/pg-core").PgColumn<{
            name: "topic2";
            tableName: "logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        topic3: import("drizzle-orm/pg-core").PgColumn<{
            name: "topic3";
            tableName: "logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 66;
            $type: `0x${string}`;
        }>;
        data: import("drizzle-orm/pg-core").PgColumn<{
            name: "data";
            tableName: "logs";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
    };
    dialect: "pg";
}>;
export declare const traces: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "traces";
    schema: "ponder_sync";
    columns: {
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "traces";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blockNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockNumber";
            tableName: "traces";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        transactionIndex: import("drizzle-orm/pg-core").PgColumn<{
            name: "transactionIndex";
            tableName: "traces";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        traceIndex: import("drizzle-orm/pg-core").PgColumn<{
            name: "traceIndex";
            tableName: "traces";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        from: import("drizzle-orm/pg-core").PgColumn<{
            name: "from";
            tableName: "traces";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        to: import("drizzle-orm/pg-core").PgColumn<{
            name: "to";
            tableName: "traces";
            dataType: "string";
            columnType: "PgVarchar";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 42;
            $type: `0x${string}`;
        }>;
        input: import("drizzle-orm/pg-core").PgColumn<{
            name: "input";
            tableName: "traces";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
        output: import("drizzle-orm/pg-core").PgColumn<{
            name: "output";
            tableName: "traces";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
        value: import("drizzle-orm/pg-core").PgColumn<{
            name: "value";
            tableName: "traces";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "traces";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        gas: import("drizzle-orm/pg-core").PgColumn<{
            name: "gas";
            tableName: "traces";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        gasUsed: import("drizzle-orm/pg-core").PgColumn<{
            name: "gasUsed";
            tableName: "traces";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
        error: import("drizzle-orm/pg-core").PgColumn<{
            name: "error";
            tableName: "traces";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        revertReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "revertReason";
            tableName: "traces";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        subcalls: import("drizzle-orm/pg-core").PgColumn<{
            name: "subcalls";
            tableName: "traces";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const rpcRequestResults: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "rpc_request_results";
    schema: "ponder_sync";
    columns: {
        requestHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "requestHash";
            tableName: "rpc_request_results";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "rpc_request_results";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blockNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockNumber";
            tableName: "rpc_request_results";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        result: import("drizzle-orm/pg-core").PgColumn<{
            name: "result";
            tableName: "rpc_request_results";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const intervals: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "intervals";
    schema: "ponder_sync";
    columns: {
        fragmentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "fragmentId";
            tableName: "intervals";
            dataType: "string";
            columnType: "PgText";
            data: FragmentId;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: FragmentId;
        }>;
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "intervals";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blocks: import("drizzle-orm/pg-core").PgColumn<{
            name: "blocks";
            tableName: "intervals";
            dataType: "custom";
            columnType: "PgCustomColumn";
            data: string;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
        }>;
    };
    dialect: "pg";
}>;
export declare const factories: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "factories";
    schema: "ponder_sync";
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "factories";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: "always";
            generated: undefined;
        }, {}, {}>;
        factory: import("drizzle-orm/pg-core").PgColumn<{
            name: "factory";
            tableName: "factories";
            dataType: "json";
            columnType: "PgJsonb";
            data: Pick<import("@/internal/types.js").LogFactory, "type" | "address" | "chainId" | "eventSelector" | "childAddressLocation" | "fromBlock" | "toBlock">;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: Pick<import("@/internal/types.js").LogFactory, "type" | "address" | "chainId" | "eventSelector" | "childAddressLocation" | "fromBlock" | "toBlock">;
        }>;
    };
    dialect: "pg";
}>;
export declare const factoryAddresses: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "factory_addresses";
    schema: "ponder_sync";
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "factory_addresses";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: "always";
            generated: undefined;
        }, {}, {}>;
        factoryId: import("drizzle-orm/pg-core").PgColumn<{
            name: "factoryId";
            tableName: "factory_addresses";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        chainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "chainId";
            tableName: "factory_addresses";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blockNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "blockNumber";
            tableName: "factory_addresses";
            dataType: "bigint";
            columnType: "PgBigInt64";
            data: bigint;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        address: import("drizzle-orm/pg-core").PgColumn<{
            name: "address";
            tableName: "factory_addresses";
            dataType: "string";
            columnType: "PgText";
            data: `0x${string}`;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: `0x${string}`;
        }>;
    };
    dialect: "pg";
}>;
//# sourceMappingURL=schema.d.ts.map