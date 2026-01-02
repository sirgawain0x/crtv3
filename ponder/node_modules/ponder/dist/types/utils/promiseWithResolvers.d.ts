export type PromiseWithResolvers<TPromise> = {
    resolve: (arg: TPromise) => void;
    reject: (error: Error) => void;
    promise: Promise<TPromise>;
};
/**
 * @description Application level polyfill.
 */
export declare const promiseWithResolvers: <TPromise>() => PromiseWithResolvers<TPromise>;
//# sourceMappingURL=promiseWithResolvers.d.ts.map