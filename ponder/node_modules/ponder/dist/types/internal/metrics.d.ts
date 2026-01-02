/// <reference types="node" resolution-mode="require"/>
import { type Worker } from "node:worker_threads";
import { type PromiseWithResolvers } from '../utils/promiseWithResolvers.js';
import prometheus from "prom-client";
import type { IndexingBuild, SchemaBuild } from "./types.js";
export declare class MetricsService {
    registry: prometheus.Registry;
    start_timestamp: number;
    progressMetadata: {
        [chain: string]: {
            batches: {
                elapsedSeconds: number;
                completedSeconds: number;
            }[];
            previousTimestamp: number;
            previousCompletedSeconds: number;
            rate: number;
        };
    };
    hasError: boolean;
    port: number | undefined;
    rps: {
        [chain: string]: {
            count: number;
            timestamp: number;
        }[];
    };
    ponder_version_info: prometheus.Gauge<"version" | "major" | "minor" | "patch">;
    ponder_settings_info: prometheus.Gauge<"ordering" | "database" | "command">;
    ponder_historical_concurrency_group_duration: prometheus.Gauge<"group">;
    ponder_historical_extract_duration: prometheus.Gauge<"step">;
    ponder_historical_transform_duration: prometheus.Gauge<"step">;
    ponder_historical_start_timestamp_seconds: prometheus.Gauge<"chain">;
    ponder_historical_end_timestamp_seconds: prometheus.Gauge<"chain">;
    ponder_historical_total_indexing_seconds: prometheus.Gauge<"chain">;
    ponder_historical_cached_indexing_seconds: prometheus.Gauge<"chain">;
    ponder_historical_completed_indexing_seconds: prometheus.Gauge<"chain">;
    ponder_indexing_timestamp: prometheus.Gauge<"chain">;
    ponder_indexing_completed_events: prometheus.Gauge<"event">;
    ponder_indexing_function_duration: prometheus.Histogram<"event">;
    ponder_indexing_cache_requests_total: prometheus.Counter<"table" | "type">;
    ponder_indexing_cache_query_duration: prometheus.Histogram<"table" | "method">;
    ponder_indexing_rpc_action_duration: prometheus.Histogram<"action">;
    ponder_indexing_rpc_prefetch_total: prometheus.Counter<"chain" | "method" | "type">;
    ponder_indexing_rpc_requests_total: prometheus.Counter<"chain" | "method" | "type">;
    ponder_indexing_store_queries_total: prometheus.Counter<"table" | "method">;
    ponder_indexing_store_raw_sql_duration: prometheus.Histogram;
    ponder_sync_block: prometheus.Gauge<"chain">;
    ponder_sync_block_timestamp: prometheus.Gauge<"chain">;
    ponder_sync_is_realtime: prometheus.Gauge<"chain">;
    ponder_sync_is_complete: prometheus.Gauge<"chain">;
    ponder_historical_total_blocks: prometheus.Gauge<"chain">;
    ponder_historical_cached_blocks: prometheus.Gauge<"chain">;
    ponder_historical_completed_blocks: prometheus.Gauge<"chain">;
    ponder_realtime_reorg_total: prometheus.Counter<"chain">;
    ponder_realtime_latency: prometheus.Histogram<"chain">;
    ponder_realtime_block_arrival_latency: prometheus.Histogram<"chain">;
    ponder_database_method_duration: prometheus.Histogram<"service" | "method">;
    ponder_database_method_error_total: prometheus.Counter<"service" | "method">;
    ponder_http_server_active_requests: prometheus.Gauge<"method" | "path">;
    ponder_http_server_request_duration_ms: prometheus.Histogram<"method" | "path" | "status">;
    ponder_http_server_request_size_bytes: prometheus.Histogram<"method" | "path" | "status">;
    ponder_http_server_response_size_bytes: prometheus.Histogram<"method" | "path" | "status">;
    ponder_rpc_request_duration: prometheus.Histogram<"chain" | "method">;
    ponder_rpc_request_error_total: prometheus.Counter<"chain" | "method">;
    ponder_postgres_query_total: prometheus.Counter<"pool">;
    ponder_postgres_query_queue_size: prometheus.Gauge<"pool">;
    ponder_postgres_pool_connections: prometheus.Gauge<"pool" | "kind">;
    constructor();
    /**
     * Get string representation for all metrics.
     * @returns Metrics encoded using Prometheus v0.0.4 format.
     */
    getMetrics(): Promise<string>;
    getRegistry(): Promise<prometheus.Registry<"text/plain; version=0.0.4; charset=utf-8">>;
    initializeIndexingMetrics({ indexingBuild, schemaBuild, }: {
        indexingBuild: Pick<IndexingBuild, "indexingFunctions">;
        schemaBuild: SchemaBuild;
    }): void;
    resetIndexingMetrics(): void;
    resetApiMetrics(): void;
}
export declare class AggregateMetricsService extends MetricsService {
    workers: Worker[];
    requests: Map<number, {
        responses: prometheus.MetricObjectWithValues<prometheus.MetricValue<string>>[][];
        workerIds: number[];
        pending: number;
        pwr: PromiseWithResolvers<void>;
    }>;
    requestId: number;
    mainThreadMetrics: MetricsService;
    constructor(mainThreadMetrics: MetricsService, workers: Worker[]);
    getMetrics(): Promise<string>;
    getRegistry(): Promise<prometheus.Registry<"text/plain; version=0.0.4; charset=utf-8">>;
}
export declare class IsolatedMetricsService extends MetricsService {
    constructor();
}
export declare function getSyncProgress(metrics: MetricsService): Promise<{
    chainName: string;
    block: number | undefined;
    status: "backfill" | "live" | "complete";
    progress: number;
    rps: number;
}[]>;
export declare function getIndexingProgress(metrics: MetricsService): Promise<{
    hasError: boolean;
    events: {
        eventName: string;
        count: number;
        averageDuration: number;
    }[];
}>;
export declare function getAppProgress(metrics: MetricsService): Promise<{
    mode: "backfill" | "live" | undefined;
    progress: number | undefined;
    eta: number | undefined;
}>;
//# sourceMappingURL=metrics.d.ts.map