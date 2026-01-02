/**
 * Merges multiple async generators into a single async generator.
 *
 * @param generators - The generators to merge.
 * @returns A single async generator that yields results from all input generators.
 */
export declare function mergeAsyncGenerators<T>(generators: AsyncGenerator<T>[]): AsyncGenerator<T>;
/**
 * Buffers the results of an async generator.
 *
 * @param generator - The generator to buffer.
 * @param size - The size of the buffer.
 * @returns An async generator that yields results from the input generator.
 */
export declare function bufferAsyncGenerator<T>(generator: AsyncGenerator<T>, size: number, bufferCallback?: (bufferSize: number) => void): AsyncGenerator<T>;
/**
 * Drains an async generator into an array.
 *
 * @param asyncGenerator - The async generator to drain.
 * @returns An array of results from the input generator.
 */
export declare function drainAsyncGenerator<T>(asyncGenerator: AsyncGenerator<T>): Promise<T[]>;
/**
 * Records the total time taken to yield results from an async generator.
 *
 * @param asyncGenerator - The async generator to record.
 * @param callback - A callback function that receives duration metrics.
 * @returns An async generator that yields results from the input generator.
 */
export declare function recordAsyncGenerator<T>(asyncGenerator: AsyncGenerator<T>, callback: (params: {
    await: number;
    yield: number;
    total: number;
}) => void): AsyncGenerator<T>;
/**
 * Creates an async generator that yields values from a callback.
 */
export declare function createCallbackGenerator<T>(bufferCallback?: (bufferSize: number) => void): {
    callback: (value: T) => void;
    generator: AsyncGenerator<T, void, unknown>;
};
//# sourceMappingURL=generators.d.ts.map