/**
 * Like `Promise.allSettled` but throws if any of the promises reject.
 *
 * @dev This is very useful when dealing with multiple concurrent promises
 * in a database transaction.
 */
export async function promiseAllSettledWithThrow(promises) {
    let firstError;
    const result = await Promise.all(promises.map((promise) => promise.catch((error) => {
        if (firstError === undefined) {
            firstError = error;
        }
    })));
    if (firstError === undefined) {
        return result;
    }
    throw firstError;
}
//# sourceMappingURL=promiseAllSettledWithThrow.js.map