import { type ColumnBaseConfig, type ColumnBuilderBaseConfig, type MakeColumnConfig, entityKind } from "drizzle-orm";
import { type AnyPgTable, PgColumn, PgColumnBuilder, type PgTextConfig } from "drizzle-orm/pg-core";
export type PgTextBuilderInitial<TName extends string, TEnum extends [string, ...string[]]> = PgTextBuilder<{
    name: TName;
    dataType: "string";
    columnType: "PgText";
    data: TEnum[number];
    enumValues: TEnum;
    driverParam: string;
}>;
export declare class PgTextBuilder<T extends ColumnBuilderBaseConfig<"string", "PgText">> extends PgColumnBuilder<T, {
    enumValues: T["enumValues"];
}> {
    static readonly [entityKind]: string;
    constructor(name: T["name"], config: PgTextConfig<T["enumValues"]>);
    /** @internal */
    build<TTableName extends string>(table: AnyPgTable<{
        name: TTableName;
    }>): PgText<MakeColumnConfig<T, TTableName>>;
}
export declare class PgText<T extends ColumnBaseConfig<"string", "PgText">> extends PgColumn<T, {
    enumValues: T["enumValues"];
}> {
    static readonly [entityKind]: string;
    readonly enumValues: T["enumValues"];
    getSQLType(): string;
    mapToDriverValue(value: string): string;
}
//# sourceMappingURL=text.d.ts.map