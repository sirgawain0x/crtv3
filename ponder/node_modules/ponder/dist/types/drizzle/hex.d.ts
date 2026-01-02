import { type ColumnBaseConfig, type ColumnBuilderBaseConfig, type MakeColumnConfig, entityKind } from "drizzle-orm";
import { type AnyPgTable, PgColumn, PgColumnBuilder } from "drizzle-orm/pg-core";
export type PgHexBuilderInitial<TName extends string> = PgHexBuilder<{
    name: TName;
    dataType: "string";
    columnType: "PgHex";
    data: `0x${string}`;
    driverParam: string;
    enumValues: undefined;
    generated: undefined;
}>;
export declare class PgHexBuilder<T extends ColumnBuilderBaseConfig<"string", "PgHex">> extends PgColumnBuilder<T> {
    static readonly [entityKind]: string;
    constructor(name: T["name"]);
    /** @internal */
    build<TTableName extends string>(table: AnyPgTable<{
        name: TTableName;
    }>): PgHex<MakeColumnConfig<T, TTableName>>;
}
export declare class PgHex<T extends ColumnBaseConfig<"string", "PgHex">> extends PgColumn<T> {
    static readonly [entityKind]: string;
    getSQLType(): string;
    mapToDriverValue(value: `0x${string}`): `0x${string}`;
}
//# sourceMappingURL=hex.d.ts.map