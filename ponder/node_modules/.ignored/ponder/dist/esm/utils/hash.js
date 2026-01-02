import { createHash } from "node:crypto";
/**
 * Generates a 10-character hexadecimal hash of a JSON-serializable value.
 */
export function hash(value) {
    return createHash("sha256")
        .update(JSON.stringify(value))
        .digest("hex")
        .slice(0, 10);
}
//# sourceMappingURL=hash.js.map