/**
 * Merges two sorted arrays into a single sorted array.
 *
 * @param array1 - The first array to merge.
 * @param array2 - The second array to merge.
 * @param compare - The comparison function to use.
 *
 * @returns The merged array.
 *
 * @example
 * ```ts
 * const result = zipper([1, 3, 5], [2, 4, 6]);
 * // result = [1, 2, 3, 4, 5, 6]
 * ```
 */
export declare const zipper: <T>(array1: T[], array2: T[], compare?: ((a: T, b: T) => number) | undefined) => T[];
/**
 * Merges many sorted arrays into a single sorted array.
 *
 * @param arrays - The arrays to merge.
 * @param compare - The comparison function to use.
 *
 * @returns The merged array.
 *
 * @example
 * ```ts
 * const result = zipperMany([
 *   [1, 3, 5],
 *   [2, 4, 6],
 *   [7, 8, 9],
 * ]);
 * // result = [1, 2, 3, 4, 5, 6, 7, 8, 9]
 * ```
 */
export declare const zipperMany: <T>(arrays: T[][], compare?: ((a: T, b: T) => number) | undefined) => T[];
//# sourceMappingURL=zipper.d.ts.map