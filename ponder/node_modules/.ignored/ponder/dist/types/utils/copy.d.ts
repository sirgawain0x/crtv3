/**
 * Symbol used to mark objects that are copied on write.
 */
export declare const COPY_ON_WRITE: unique symbol;
/**
 * Create a copy-on-write proxy for an object.
 */
export declare const copyOnWrite: <T extends object>(obj: T) => T;
/**
 * Create a deep copy of an object.
 *
 * @dev This function supports copying objects that
 * have been created with `copyOnWrite`.
 */
export declare const copy: <T>(obj: T) => T;
//# sourceMappingURL=copy.d.ts.map