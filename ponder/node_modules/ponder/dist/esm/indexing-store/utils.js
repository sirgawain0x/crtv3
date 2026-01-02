import { getPrimaryKeyColumns } from '../drizzle/index.js';
import { BigIntSerializationError, NotNullConstraintError, } from '../internal/errors.js';
import { prettyPrint } from '../utils/print.js';
import { and, eq, getTableColumns, getTableName, } from "drizzle-orm";
import { PgArray } from "drizzle-orm/pg-core";
/**
 * Returns true if the column has a "default" value that is used when no value is passed.
 * Handles `.default`, `.$defaultFn()`, `.$onUpdateFn()`.
 */
export const hasEmptyValue = (column) => {
    return column.hasDefault;
};
/** Returns the "default" value for `column`. */
export const getEmptyValue = (column, isUpdate) => {
    if (isUpdate && column.onUpdateFn) {
        return column.onUpdateFn();
    }
    if (column.default !== undefined)
        return column.default;
    if (column.defaultFn !== undefined)
        return column.defaultFn();
    if (column.onUpdateFn !== undefined)
        return column.onUpdateFn();
    // TODO(kyle) is it an invariant that it doesn't get here
    return undefined;
};
export const getPrimaryKeyCache = (tables) => {
    const cache = new Map();
    for (const table of tables) {
        cache.set(table, []);
        for (const { js } of getPrimaryKeyColumns(table)) {
            // @ts-expect-error
            cache.get(table).push([js, table[js]]);
        }
    }
    return cache;
};
export const normalizeColumn = (column, value, isUpdate) => {
    if (value === undefined) {
        if (hasEmptyValue(column))
            return getEmptyValue(column, isUpdate);
        return null;
    }
    if (value === null)
        return null;
    if (column.mapToDriverValue === undefined)
        return value;
    try {
        if (Array.isArray(value) && column instanceof PgArray) {
            return value.map((v) => {
                if (column.baseColumn.columnType === "PgTimestamp") {
                    return v;
                }
                return column.baseColumn.mapFromDriverValue(column.baseColumn.mapToDriverValue(v));
            });
        }
        if (column.columnType === "PgTimestamp") {
            return value;
        }
        return column.mapFromDriverValue(column.mapToDriverValue(value));
    }
    catch (e) {
        if (e?.message?.includes("Do not know how to serialize a BigInt")) {
            const error = new BigIntSerializationError(e.message);
            error.meta.push("Hint:\n  The JSON column type does not support BigInt values. Use the replaceBigInts() helper function before inserting into the database. Docs: https://ponder.sh/docs/api-reference/ponder-utils#replacebigints");
            throw error;
        }
        throw e;
    }
};
export const normalizeRow = (table, row, isUpdate) => {
    for (const [columnName, column] of Object.entries(getTableColumns(table))) {
        // not-null constraint
        if (isUpdate === false &&
            (row[columnName] === undefined || row[columnName] === null) &&
            column.notNull &&
            hasEmptyValue(column) === false) {
            const error = new NotNullConstraintError(`Column '${getTableName(table)}.${columnName}' violates not-null constraint.`);
            error.meta.push(`db.insert arguments:\n${prettyPrint(row)}`);
            throw error;
        }
        row[columnName] = normalizeColumn(column, row[columnName], isUpdate);
    }
    return row;
};
export const getCacheKey = (table, key, cache) => {
    const primaryKeys = cache.get(table);
    if (primaryKeys.length === 1) {
        const [pk, col] = primaryKeys[0];
        // @ts-expect-error
        return String(normalizeColumn(col, key[pk], false));
    }
    let result = "";
    for (let i = 0; i < primaryKeys.length; i++) {
        const [pk, col] = primaryKeys[i];
        // @ts-expect-error
        const value = normalizeColumn(col, key[pk], false);
        result += `${String(value)}_`;
    }
    return result;
};
/** Returns an sql where condition for `table` with `key`. */
export const getWhereCondition = (table, key) => {
    const conditions = [];
    for (const { js } of getPrimaryKeyColumns(table)) {
        // @ts-ignore
        conditions.push(eq(table[js], key[js]));
    }
    return and(...conditions);
};
//# sourceMappingURL=utils.js.map