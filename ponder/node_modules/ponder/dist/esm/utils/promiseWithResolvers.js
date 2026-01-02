/**
 * @description Application level polyfill.
 */
export const promiseWithResolvers = () => {
    let resolve;
    let reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return { resolve: resolve, reject: reject, promise };
};
//# sourceMappingURL=promiseWithResolvers.js.map