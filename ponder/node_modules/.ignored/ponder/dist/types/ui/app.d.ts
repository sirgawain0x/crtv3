import type { getAppProgress, getIndexingProgress, getSyncProgress } from '../internal/metrics.js';
export type UiState = {
    port: number;
    hostname: string;
    sync: Awaited<ReturnType<typeof getSyncProgress>>;
    indexing: Awaited<ReturnType<typeof getIndexingProgress>>;
    app: Awaited<ReturnType<typeof getAppProgress>>;
};
export declare const initialUiState: UiState;
export declare const buildTable: (rows: {
    [key: string]: any;
}[], columns: {
    title: string;
    key: string;
    align: "left" | "right" | string;
    format?: ((value: any, row: {
        [key: string]: any;
    }) => string | number) | undefined;
    maxWidth?: number | undefined;
}[]) => string[];
export declare const buildUiLines: (ui: UiState) => string[];
//# sourceMappingURL=app.d.ts.map