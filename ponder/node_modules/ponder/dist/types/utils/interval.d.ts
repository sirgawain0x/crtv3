export type Interval = [number, number];
/**
 * Return the total sum of a list of numeric intervals.
 *
 * @param intervals List of numeric intervals to find the sum of.
 * @returns Sum of the intervals.
 */
export declare function intervalSum(intervals: Interval[]): number;
/**
 * Return the union of a list of numeric intervals.
 *
 * @param intervals List of numeric intervals to find the union of.
 * @returns Union of the intervals, represented as a list of intervals.
 */
export declare function intervalUnion(intervals_: Interval[]): Interval[];
/**
 * Return the intersection of two lists of numeric intervals.
 *
 * @param list1 First list of numeric intervals.
 * @param list2 Second list of numeric intervals.
 * @returns Intersection of the intervals, represented as a list of intervals.
 */
export declare function intervalIntersection(list1: Interval[], list2: Interval[]): Interval[];
/**
 * Return the intersection of many lists of numeric intervals.
 *
 * @param list1 First list of numeric intervals.
 * @param list2 Second list of numeric intervals.
 * @returns Intersection of the intervals, represented as a list of intervals.
 */
export declare function intervalIntersectionMany(lists: Interval[][]): Interval[];
/**
 * Return the difference between two lists of numeric intervals (initial - remove).
 *
 * @param initial Starting/base list of numeric intervals.
 * @param remove List of numeric intervals to remove.
 * @returns Difference of the intervals, represented as a list of intervals.
 */
export declare function intervalDifference(initial: Interval[], remove: Interval[]): Interval[];
/**
 * Return an interval that encompasses all the intervals in the list.
 *
 * @param intervals List of numeric intervals to find the bounds of.
 * @returns Bounds of the intervals.
 */
export declare function intervalBounds(intervals: Interval[]): Interval;
export declare function sortIntervals(intervals: Interval[]): Interval[];
export declare function getChunks({ interval, maxChunkSize, }: {
    interval: Interval;
    maxChunkSize: number;
}): Interval[];
export declare function intervalRange(interval: Interval): number[];
//# sourceMappingURL=interval.d.ts.map