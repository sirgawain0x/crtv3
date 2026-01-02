import { d as PGliteInterface } from '../pglite-DnNPQGYh.js';

declare const vector: {
    name: string;
    setup: (_pg: PGliteInterface, emscriptenOpts: any) => Promise<{
        emscriptenOpts: any;
        bundlePath: URL;
    }>;
};

export { vector };
