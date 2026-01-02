/**
 * Remove duplicate values from an array.
 *
 * @param getId callback used to calculate a unique value for an element of the array.
 *
 * @example
 * dedupe([1,1,2,3]) // [1,2,3]
 *
 * dedupe(
 *   [
 *     { a: 1, b: 2 },
 *     { a: 1, b: 2 },
 *     { a: 2, b: 2 },
 *   ],
 *   (e) => `${e.a}_${e.b}`,
 * ) // [{a: 1, b: 2}, {a: 2, b: 2}]
 *
 */
export function dedupe(arr, getId) {
    const seen = new Set();
    return arr.filter((x) => {
        const id = getId ? getId(x) : x;
        if (seen.has(id))
            return false;
        seen.add(id);
        return true;
    });
}
//# sourceMappingURL=dedupe.js.map