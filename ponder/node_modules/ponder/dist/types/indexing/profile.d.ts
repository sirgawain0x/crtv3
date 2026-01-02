import type { Event } from '../internal/types.js';
import type { PonderActions, ProfilePattern, Request } from "./client.js";
export declare const getProfilePatternKey: (pattern: ProfilePattern) => string;
export declare const recordProfilePattern: ({ event, args, hints, }: {
    event: Event;
    args: Parameters<PonderActions["readContract"]>[0];
    hints: {
        pattern: ProfilePattern;
        hasConstant: boolean;
    }[];
}) => {
    pattern: ProfilePattern;
    hasConstant: boolean;
} | undefined;
export declare const recoverProfilePattern: (pattern: ProfilePattern, event: Event) => Request;
//# sourceMappingURL=profile.d.ts.map