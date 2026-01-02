var _a, _b;
import { entityKind, } from "drizzle-orm";
import { PgColumn, PgColumnBuilder, } from "drizzle-orm/pg-core";
class PgBytesBuilder extends PgColumnBuilder {
    constructor(name) {
        super(name, "buffer", "PgBytes");
    }
    /** @internal */
    // @ts-ignore
    build(table) {
        return new PgBytes(table, this.config);
    }
    /**
     * @deprecated Bytes columns cannot be used as arrays
     */
    array() {
        throw new Error("bytes().array() is not supported");
    }
}
_a = entityKind;
Object.defineProperty(PgBytesBuilder, _a, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgBytesBuilder"
});
export { PgBytesBuilder };
class PgBytes extends PgColumn {
    getSQLType() {
        return "bytea";
    }
    mapFromDriverValue(value) {
        return new Uint8Array(value);
    }
    mapToDriverValue(value) {
        return Buffer.from(value);
    }
}
_b = entityKind;
Object.defineProperty(PgBytes, _b, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgBytes"
});
export { PgBytes };
//# sourceMappingURL=bytes.js.map