var _a, _b;
import { entityKind, getTableName, } from "drizzle-orm";
import { PgColumn, PgColumnBuilder, } from "drizzle-orm/pg-core";
class PgTextBuilder extends PgColumnBuilder {
    constructor(name, config) {
        super(name, "string", "PgText");
        this.config.enumValues = config.enum;
    }
    /** @internal */
    // @ts-ignore
    build(table) {
        return new PgText(table, this.config);
    }
}
_a = entityKind;
Object.defineProperty(PgTextBuilder, _a, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgTextBuilder"
});
export { PgTextBuilder };
class PgText extends PgColumn {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "enumValues", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.config.enumValues
        });
    }
    getSQLType() {
        return "text";
    }
    mapToDriverValue(value) {
        // Note: swallow errors because drizzle will throw a more specific error if the value is invalid
        try {
            if (value.match(/\0/g)) {
                globalThis.PONDER_COMMON?.logger.warn({
                    msg: `Detected and removed null byte characters. Postgres "text" columns do not support null byte characters. Please consider handling this case in your indexing logic.`,
                    value,
                    table: getTableName(this.table),
                    column: this.name,
                });
                return value.replace(/\0/g, "");
            }
        }
        catch { }
        return value;
    }
}
_b = entityKind;
Object.defineProperty(PgText, _b, {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "PgText"
});
export { PgText };
//# sourceMappingURL=text.js.map