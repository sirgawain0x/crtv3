import { getLocalEventGenerator, refetchLocalEvents } from "./historical.js";
import { getLocalSyncProgress, } from "./index.js";
export async function initEventGenerator(params) {
    return getLocalEventGenerator(params);
}
export async function initRefetchEvents(params) {
    return refetchLocalEvents(params);
}
export async function initSyncProgress(params) {
    return getLocalSyncProgress(params);
}
//# sourceMappingURL=init.js.map