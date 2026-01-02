import { promiseWithResolvers } from './promiseWithResolvers.js';
import { startClock } from "./timer.js";
/**
 * Merges multiple async generators into a single async generator.
 *
 * @param generators - The generators to merge.
 * @returns A single async generator that yields results from all input generators.
 */
export async function* mergeAsyncGenerators(generators) {
    const promises = generators.map((gen) => gen.next());
    while (promises.length > 0) {
        const wrappedPromises = promises.map((promise, index) => promise.then((result) => ({ index, result })));
        const { result, index } = await Promise.race(wrappedPromises);
        if (result.done) {
            generators.splice(index, 1);
            promises.splice(index, 1);
        }
        else {
            const generator = generators[index];
            const promise = generator.next();
            promises.splice(index, 1);
            generators.splice(index, 1);
            generators.push(generator);
            promises.push(promise);
            yield result.value;
        }
    }
}
/**
 * Buffers the results of an async generator.
 *
 * @param generator - The generator to buffer.
 * @param size - The size of the buffer.
 * @returns An async generator that yields results from the input generator.
 */
export async function* bufferAsyncGenerator(generator, size, bufferCallback) {
    const buffer = [];
    let done = false;
    let pwr1 = promiseWithResolvers();
    let pwr2 = promiseWithResolvers();
    (async () => {
        for await (const result of generator) {
            buffer.push(result);
            bufferCallback?.(buffer.length);
            pwr1.resolve();
            if (buffer.length >= size)
                await pwr2.promise;
            pwr2 = promiseWithResolvers();
        }
        done = true;
        pwr1.resolve();
    })();
    while (done === false || buffer.length > 0) {
        if (buffer.length > 0) {
            pwr2.resolve();
            yield buffer.shift();
        }
        else {
            await pwr1.promise;
            pwr1 = promiseWithResolvers();
        }
    }
}
/**
 * Drains an async generator into an array.
 *
 * @param asyncGenerator - The async generator to drain.
 * @returns An array of results from the input generator.
 */
export async function drainAsyncGenerator(asyncGenerator) {
    const result = [];
    for await (const events of asyncGenerator) {
        result.push(events);
    }
    return result;
}
/**
 * Records the total time taken to yield results from an async generator.
 *
 * @param asyncGenerator - The async generator to record.
 * @param callback - A callback function that receives duration metrics.
 * @returns An async generator that yields results from the input generator.
 */
export async function* recordAsyncGenerator(asyncGenerator, callback) {
    let endClockTotal = startClock();
    for await (const result of asyncGenerator) {
        const endClockInner = startClock();
        yield result;
        callback({
            await: endClockTotal() - endClockInner(),
            yield: endClockInner(),
            total: endClockTotal(),
        });
        endClockTotal = startClock();
    }
}
/**
 * Creates an async generator that yields values from a callback.
 */
export function createCallbackGenerator(bufferCallback) {
    const buffer = [];
    let pwr = promiseWithResolvers();
    const callback = (value) => {
        buffer.push(value);
        bufferCallback?.(buffer.length);
        pwr.resolve();
    };
    async function* generator() {
        while (true) {
            if (buffer.length > 0) {
                yield buffer.shift();
            }
            else {
                await pwr.promise;
                pwr = promiseWithResolvers();
            }
        }
    }
    return { callback, generator: generator() };
}
//# sourceMappingURL=generators.js.map