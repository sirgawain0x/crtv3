#!/usr/bin/env node
import type { Prettify } from '../types/utils.js';
import { Command } from "@commander-js/extra-typings";
declare const ponder: Command<[], {
    root?: string | undefined;
    config: string;
    debug?: true | undefined;
    trace?: true | undefined;
    logLevel?: string | undefined;
    logFormat: string;
}>;
type GlobalOptions = {
    command: "dev" | "start" | "serve" | "codegen";
    version: string;
} & ReturnType<typeof ponder.opts>;
declare const devCommand: Command<[], {
    schema?: string | undefined;
    port: number;
    hostname?: string | undefined;
    disableUi?: true | undefined;
}>;
declare const startCommand: Command<[], {
    schema?: string | undefined;
    viewsSchema?: string | undefined;
    port: number;
    hostname?: string | undefined;
}>;
declare const serveCommand: Command<[], {
    schema?: string | undefined;
    port: number;
    hostname?: string | undefined;
}>;
declare const dbCommand: Command<[], {}>;
declare const codegenCommand: Command<[], {}>;
export type CliOptions = Prettify<GlobalOptions & Partial<ReturnType<typeof devCommand.opts> & ReturnType<typeof startCommand.opts> & ReturnType<typeof serveCommand.opts> & ReturnType<typeof dbCommand.opts> & ReturnType<typeof codegenCommand.opts>>>;
export {};
//# sourceMappingURL=ponder.d.ts.map