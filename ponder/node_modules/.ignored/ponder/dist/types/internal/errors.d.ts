/** Base class for all known errors. */
export declare class BaseError extends Error {
    name: string;
    meta: string[];
    constructor(message?: string | undefined, { cause }?: {
        cause?: Error;
    });
}
/** Error caused by user code. Should not be retried. */
export declare class NonRetryableUserError extends BaseError {
    name: string;
    constructor(message?: string | undefined, { cause }?: {
        cause?: Error;
    });
}
/** Error that may succeed if tried again. */
export declare class RetryableError extends BaseError {
    name: string;
    constructor(message?: string | undefined, { cause }?: {
        cause?: Error;
    });
}
export declare class ShutdownError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class BuildError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class MigrationError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class UniqueConstraintError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class NotNullConstraintError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class InvalidStoreAccessError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class RecordNotFoundError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class CheckConstraintError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class DbConnectionError extends RetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class TransactionStatementError extends RetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class CopyFlushError extends RetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class InvalidEventAccessError extends RetryableError {
    name: string;
    key: string;
    constructor(key: string, message?: string | undefined);
}
export declare class InvalidStoreMethodError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class UndefinedTableError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class BigIntSerializationError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class DelayedInsertError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class RawSqlError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class IndexingFunctionError extends NonRetryableUserError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class RpcProviderError extends BaseError {
    name: string;
    constructor(message?: string | undefined);
}
export declare const nonRetryableUserErrorNames: string[];
//# sourceMappingURL=errors.d.ts.map