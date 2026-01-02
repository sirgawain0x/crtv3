import { promiseWithResolvers, } from "./promiseWithResolvers.js";
export const createLock = () => {
    const queue = [];
    let locked = false;
    return {
        lock: async () => {
            if (locked === false) {
                locked = true;
                return;
            }
            const pwr = promiseWithResolvers();
            queue.push(pwr);
            return pwr.promise;
        },
        unlock: () => {
            if (queue.length > 0) {
                const pwr = queue.shift();
                pwr.resolve();
            }
            else {
                locked = false;
            }
        },
    };
};
//# sourceMappingURL=mutex.js.map