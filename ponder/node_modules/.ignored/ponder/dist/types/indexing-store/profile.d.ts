import type { Event } from '../internal/types.js';
import type { Column, Table } from "drizzle-orm";
import type { ProfilePattern, Row } from "./cache.js";
export declare const getProfilePatternKey: (pattern: ProfilePattern) => string;
export declare const recordProfilePattern: (event: Event, table: Table, key: object, hints: ProfilePattern[], cache: Map<Table, [string, Column][]>) => ProfilePattern | undefined;
export declare const recoverProfilePattern: (pattern: ProfilePattern, event: Event) => Row;
//# sourceMappingURL=profile.d.ts.map