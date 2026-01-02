type JSONSerializable = string | number | boolean | null | JSONObject | JSONArray;
type JSONObject = {
    [key: string]: JSONSerializable;
};
type JSONArray = Array<JSONSerializable>;
/**
 * Generates a 10-character hexadecimal hash of a JSON-serializable value.
 */
export declare function hash(value: JSONSerializable): string;
export {};
//# sourceMappingURL=hash.d.ts.map