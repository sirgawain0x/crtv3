export type InnerQueue<returnType, taskType> = {
    task: taskType;
    resolve: (arg: returnType) => void;
    reject: (error: Error) => void;
}[];
export type Queue<returnType, taskType> = {
    size: () => number;
    pending: () => Promise<number>;
    add: (task: taskType) => Promise<returnType>;
    clear: (callback?: (e: InnerQueue<returnType, taskType>[number]) => void) => void;
    isStarted: () => boolean;
    start: () => Promise<void>;
    pause: () => void;
    onIdle: () => Promise<void>;
    onEmpty: () => Promise<void>;
    setParameters: (parameters: Pick<CreateQueueParameters<unknown, unknown>, "frequency" | "concurrency">) => void;
};
export type CreateQueueParameters<returnType, taskType> = {
    worker: (task: taskType) => Promise<returnType>;
    initialStart?: boolean;
    browser?: boolean;
} & ({
    concurrency: number;
    frequency: number;
} | {
    concurrency: number;
    frequency?: undefined;
} | {
    concurrency?: undefined;
    frequency: number;
});
export declare const createQueue: <returnType, taskType = void>({ worker, initialStart, browser, ..._parameters }: CreateQueueParameters<returnType, taskType>) => Queue<returnType, taskType>;
//# sourceMappingURL=queue.d.ts.map