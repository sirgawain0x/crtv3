import { type ColumnBaseConfig, type ColumnBuilderBaseConfig, type MakeColumnConfig, entityKind } from "drizzle-orm";
import { type AnyPgTable, PgColumn, PgColumnBuilder } from "drizzle-orm/pg-core";
export type PgBigintBuilderInitial<TName extends string> = PgBigintBuilder<{
    name: TName;
    dataType: "bigint";
    columnType: "PgEvmBigint";
    data: bigint;
    driverParam: string;
    enumValues: undefined;
    generated: undefined;
}>;
export declare class PgBigintBuilder<T extends ColumnBuilderBaseConfig<"bigint", "PgEvmBigint">> extends PgColumnBuilder<T> {
    static readonly [entityKind]: string;
    constructor(name: T["name"]);
    /** @internal */
    build<TTableName extends string>(table: AnyPgTable<{
        name: TTableName;
    }>): PgBigint<MakeColumnConfig<T, TTableName>>;
}
export declare class PgBigint<T extends ColumnBaseConfig<"bigint", "PgEvmBigint">> extends PgColumn<T> {
    static readonly [entityKind]: string;
    getSQLType(): string;
    mapFromDriverValue(value: string): bigint;
}
//# sourceMappingURL=bigint.d.ts.map