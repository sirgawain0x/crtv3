/**
 * Like `Promise.allSettled` but throws if any of the promises reject.
 *
 * @dev This is very useful when dealing with multiple concurrent promises
 * in a database transaction.
 */
export declare function promiseAllSettledWithThrow<T>(promises: Promise<T>[]): Promise<T[]>;
//# sourceMappingURL=promiseAllSettledWithThrow.d.ts.map