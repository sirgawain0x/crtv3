declare class ESBuildTransformError extends Error {
    name: string;
}
declare class ESBuildBuildError extends Error {
    name: string;
}
declare class ESBuildContextError extends Error {
    name: string;
}
type ViteNodeError = ESBuildTransformError | ESBuildBuildError | ESBuildContextError | Error;
export declare function parseViteNodeError(file: string, error: Error): ViteNodeError;
export {};
//# sourceMappingURL=stacktrace.d.ts.map