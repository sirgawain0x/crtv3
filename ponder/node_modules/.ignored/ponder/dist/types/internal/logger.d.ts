import type { Prettify } from '../types/utils.js';
import { type LevelWithSilent } from "pino";
export type LogMode = "pretty" | "json";
export type LogLevel = Prettify<LevelWithSilent>;
export type Logger = {
    error<T extends Omit<Log, "level" | "time">>(options: T, printKeys?: (keyof T)[]): void;
    warn<T extends Omit<Log, "level" | "time">>(options: T, printKeys?: (keyof T)[]): void;
    info<T extends Omit<Log, "level" | "time">>(options: T, printKeys?: (keyof T)[]): void;
    debug<T extends Omit<Log, "level" | "time">>(options: T, printKeys?: (keyof T)[]): void;
    trace<T extends Omit<Log, "level" | "time">>(options: T, printKeys?: (keyof T)[]): void;
    child: (bindings: Record<string, unknown>) => Logger;
    flush(): Promise<void>;
};
type Log = {
    level: 50 | 40 | 30 | 20 | 10;
    time: number;
    msg: string;
    duration?: number;
    error?: Error;
} & Record<string, unknown>;
export declare function createLogger({ level, mode, }: {
    level: LogLevel;
    mode?: LogMode;
}): Logger;
export declare function createNoopLogger(_args?: {
    level?: LogLevel;
    mode?: LogMode;
}): {
    error(_options: Omit<Log, "level" | "time">): void;
    warn(_options: Omit<Log, "level" | "time">): void;
    info(_options: Omit<Log, "level" | "time">): void;
    debug(_options: Omit<Log, "level" | "time">): void;
    trace(_options: Omit<Log, "level" | "time">): void;
    flush: () => Promise<unknown>;
};
export {};
//# sourceMappingURL=logger.d.ts.map