/// <reference types="node" resolution-mode="require"/>
import { type ColumnBaseConfig, type ColumnBuilderBaseConfig, type MakeColumnConfig, entityKind } from "drizzle-orm";
import { type AnyPgTable, PgColumn, PgColumnBuilder } from "drizzle-orm/pg-core";
export type PgBytesBuilderInitial<TName extends string> = PgBytesBuilder<{
    name: TName;
    dataType: "buffer";
    columnType: "PgBytes";
    data: Uint8Array;
    driverParam: string;
    enumValues: undefined;
    generated: undefined;
}>;
export declare class PgBytesBuilder<T extends ColumnBuilderBaseConfig<"buffer", "PgBytes">> extends PgColumnBuilder<T> {
    static readonly [entityKind]: string;
    constructor(name: T["name"]);
    /** @internal */
    build<TTableName extends string>(table: AnyPgTable<{
        name: TTableName;
    }>): PgBytes<MakeColumnConfig<T, TTableName>>;
    /**
     * @deprecated Bytes columns cannot be used as arrays
     */
    array(): never;
}
export declare class PgBytes<T extends ColumnBaseConfig<"buffer", "PgBytes">> extends PgColumn<T> {
    static readonly [entityKind]: string;
    getSQLType(): string;
    mapFromDriverValue(value: Buffer): Uint8Array;
    mapToDriverValue(value: Uint8Array): Buffer;
}
//# sourceMappingURL=bytes.d.ts.map