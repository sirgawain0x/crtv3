export type Shutdown = {
    add: (callback: () => unknown | Promise<unknown>) => void;
    kill: () => Promise<void>;
    isKilled: boolean;
    abortController: AbortController;
};
export declare const createShutdown: () => Shutdown;
//# sourceMappingURL=shutdown.d.ts.map