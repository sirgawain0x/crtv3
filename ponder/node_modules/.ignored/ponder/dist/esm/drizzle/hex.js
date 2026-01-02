var _a, _b;
import { entityKind, } from "drizzle-orm";
import { PgColumn, PgColumnBuilder, } from "drizzle-orm/pg-core";
class PgHexBuilder extends PgColumnBuilder {
    constructor(name) {
        super(name, "string", "PgHex");
    }
    /** @internal */
    // @ts-ignore
    build(table) {
        return new PgHex(table, this.config);
    }
}
_a = entityKind;
Object.defineProperty(PgHexBuilder, _a, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgHexBuilder"
});
export { PgHexBuilder };
class PgHex extends PgColumn {
    getSQLType() {
        return "text";
    }
    mapToDriverValue(value) {
        if (value.length % 2 === 0)
            return value.toLowerCase();
        return `0x0${value.slice(2)}`.toLowerCase();
    }
}
_b = entityKind;
Object.defineProperty(PgHex, _b, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgHex"
});
export { PgHex };
//# sourceMappingURL=hex.js.map