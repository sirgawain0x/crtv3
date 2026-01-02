import { promiseWithResolvers, } from "./promiseWithResolvers.js";
const validateParameters = ({ concurrency, frequency, }) => {
    if (concurrency === undefined && frequency === undefined) {
        throw new Error("Invalid queue configuration, must specify either 'concurrency' or 'frequency'.");
    }
    if (concurrency !== undefined && concurrency <= 0) {
        throw new Error(`Invalid value for queue 'concurrency' option. Got ${concurrency}, expected a number greater than zero.`);
    }
    if (frequency !== undefined && frequency <= 0) {
        throw new Error(`Invalid value for queue 'frequency' option. Got ${frequency}, expected a number greater than zero.`);
    }
};
export const createQueue = ({ worker, initialStart = false, browser = true, ..._parameters }) => {
    validateParameters(_parameters);
    const parameters = _parameters;
    let queue = new Array();
    let pending = 0;
    let timestamp = 0;
    let requests = 0;
    let isStarted = initialStart;
    let timer;
    let emptyPromiseWithResolvers = undefined;
    let idlePromiseWithResolvers = undefined;
    const next = () => {
        if (!isStarted)
            return;
        const _timestamp = Date.now();
        if (Math.floor(_timestamp / 1000) !== timestamp) {
            requests = 0;
            timestamp = Math.floor(_timestamp / 1000);
        }
        if (timer)
            return;
        while ((parameters.frequency !== undefined
            ? requests < parameters.frequency
            : true) &&
            (parameters.concurrency !== undefined
                ? pending < parameters.concurrency
                : true) &&
            queue.length > 0) {
            const { task, resolve, reject } = queue.shift();
            requests++;
            pending++;
            worker(task)
                .then(resolve)
                .catch(reject)
                .finally(() => {
                pending--;
                if (idlePromiseWithResolvers !== undefined &&
                    queue.length === 0 &&
                    pending === 0) {
                    idlePromiseWithResolvers.resolve();
                    idlePromiseWithResolvers.completed = true;
                }
                browser ? next() : process.nextTick(next);
            });
            if (emptyPromiseWithResolvers !== undefined && queue.length === 0) {
                emptyPromiseWithResolvers.resolve();
                emptyPromiseWithResolvers.completed = true;
            }
        }
        if (parameters.frequency !== undefined &&
            requests >= parameters.frequency) {
            timer = setTimeout(() => {
                timer = undefined;
                next();
            }, 1000 - (_timestamp % 1000));
            return;
        }
    };
    return {
        size: () => queue.length,
        pending: () => {
            if (browser) {
                return new Promise((resolve) => setTimeout(() => resolve(pending)));
            }
            else {
                return new Promise((resolve) => setImmediate(() => resolve(pending)));
            }
        },
        add: (task) => {
            const { promise, resolve, reject } = promiseWithResolvers();
            queue.push({ task, resolve, reject });
            next();
            return promise;
        },
        clear: (callback) => {
            if (callback) {
                for (const e of queue) {
                    callback(e);
                }
            }
            queue = new Array();
            clearTimeout(timer);
            timer = undefined;
        },
        isStarted: () => isStarted,
        start: () => {
            if (browser) {
                return new Promise((resolve) => setTimeout(() => resolve(pending))).then(() => {
                    isStarted = true;
                    next();
                });
            }
            else {
                return new Promise((resolve) => process.nextTick(() => resolve(pending))).then(() => {
                    isStarted = true;
                    next();
                });
            }
        },
        pause: () => {
            isStarted = false;
        },
        onIdle: () => {
            if (idlePromiseWithResolvers === undefined ||
                idlePromiseWithResolvers.completed) {
                if (queue.length === 0 && pending === 0)
                    return Promise.resolve();
                idlePromiseWithResolvers = {
                    ...promiseWithResolvers(),
                    completed: false,
                };
            }
            return idlePromiseWithResolvers.promise;
        },
        onEmpty: () => {
            if (emptyPromiseWithResolvers === undefined ||
                emptyPromiseWithResolvers.completed) {
                if (queue.length === 0)
                    return Promise.resolve();
                emptyPromiseWithResolvers = {
                    ...promiseWithResolvers(),
                    completed: false,
                };
            }
            return emptyPromiseWithResolvers.promise;
        },
        setParameters: (_parameters) => {
            validateParameters(_parameters);
            if ("frequency" in _parameters) {
                parameters.frequency = _parameters.frequency;
            }
            if ("concurrency" in _parameters) {
                parameters.concurrency = _parameters.concurrency;
            }
        },
    };
};
//# sourceMappingURL=queue.js.map