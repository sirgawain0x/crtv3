var _a, _b;
import { entityKind, } from "drizzle-orm";
import { PgColumn, PgColumnBuilder, } from "drizzle-orm/pg-core";
class PgBigintBuilder extends PgColumnBuilder {
    constructor(name) {
        super(name, "bigint", "PgEvmBigint");
    }
    /** @internal */
    // @ts-ignore
    build(table) {
        return new PgBigint(table, this.config);
    }
}
_a = entityKind;
Object.defineProperty(PgBigintBuilder, _a, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgEvmBigintBuilder"
});
export { PgBigintBuilder };
class PgBigint extends PgColumn {
    getSQLType() {
        return "numeric(78)";
    }
    mapFromDriverValue(value) {
        return BigInt(value);
    }
}
_b = entityKind;
Object.defineProperty(PgBigint, _b, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgEvmBigint"
});
export { PgBigint };
//# sourceMappingURL=bigint.js.map