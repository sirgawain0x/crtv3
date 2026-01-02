import { type ColumnBaseConfig, entityKind } from "drizzle-orm";
import type { ColumnBuilderBaseConfig, MakeColumnConfig } from "drizzle-orm/column-builder";
import { type AnyPgTable, PgColumn, PgColumnBuilder } from "drizzle-orm/pg-core";
export type PgJsonBuilderInitial<TName extends string> = PgJsonBuilder<{
    name: TName;
    dataType: "json";
    columnType: "PgJson";
    data: unknown;
    driverParam: string;
    enumValues: undefined;
}>;
export declare class PgJsonBuilder<T extends ColumnBuilderBaseConfig<"json", "PgJson">> extends PgColumnBuilder<T> {
    static readonly [entityKind]: string;
    constructor(name: T["name"]);
    /** @internal */
    build<TTableName extends string>(table: AnyPgTable<{
        name: TTableName;
    }>): PgJson<MakeColumnConfig<T, TTableName>>;
}
export declare class PgJson<T extends ColumnBaseConfig<"json", "PgJson">> extends PgColumn<T> {
    static readonly [entityKind]: string;
    getSQLType(): string;
    mapToDriverValue(value: T["data"]): string;
    mapFromDriverValue(value: T["data"] | string): T["data"];
}
export type PgJsonbBuilderInitial<TName extends string> = PgJsonbBuilder<{
    name: TName;
    dataType: "json";
    columnType: "PgJsonb";
    data: unknown;
    driverParam: unknown;
    enumValues: undefined;
}>;
export declare class PgJsonbBuilder<T extends ColumnBuilderBaseConfig<"json", "PgJsonb">> extends PgColumnBuilder<T> {
    static readonly [entityKind]: string;
    constructor(name: T["name"]);
    /** @internal */
    build<TTableName extends string>(table: AnyPgTable<{
        name: TTableName;
    }>): PgJsonb<MakeColumnConfig<T, TTableName>>;
}
export declare class PgJsonb<T extends ColumnBaseConfig<"json", "PgJsonb">> extends PgColumn<T> {
    static readonly [entityKind]: string;
    constructor(table: AnyPgTable<{
        name: T["tableName"];
    }>, config: PgJsonbBuilder<T>["config"]);
    getSQLType(): string;
    mapToDriverValue(value: T["data"]): string;
    mapFromDriverValue(value: T["data"] | string): T["data"];
}
//# sourceMappingURL=json.d.ts.map