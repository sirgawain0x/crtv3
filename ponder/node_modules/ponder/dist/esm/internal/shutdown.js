export const createShutdown = () => {
    const abortController = new AbortController();
    const callbacks = [];
    return {
        add: (callback) => {
            if (abortController.signal.aborted) {
                callback();
                return;
            }
            callbacks.push(callback);
        },
        kill: async () => {
            if (abortController.signal.aborted)
                return;
            abortController.abort();
            await Promise.all(callbacks.map((callback) => callback()));
        },
        get isKilled() {
            return abortController.signal.aborted;
        },
        abortController,
    };
};
//# sourceMappingURL=shutdown.js.map