/** Base class for all known errors. */
export class BaseError extends Error {
    constructor(message, { cause } = {}) {
        super(message, { cause });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "BaseError"
        });
        Object.defineProperty(this, "meta", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.setPrototypeOf(this, BaseError.prototype);
    }
}
/** Error caused by user code. Should not be retried. */
export class NonRetryableUserError extends BaseError {
    constructor(message, { cause } = {}) {
        super(message, { cause });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "NonRetryableUserError"
        });
        Object.setPrototypeOf(this, NonRetryableUserError.prototype);
    }
}
/** Error that may succeed if tried again. */
export class RetryableError extends BaseError {
    constructor(message, { cause } = {}) {
        super(message, { cause });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "RetryableError"
        });
        Object.setPrototypeOf(this, RetryableError.prototype);
    }
}
export class ShutdownError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "ShutdownError"
        });
        Object.setPrototypeOf(this, ShutdownError.prototype);
    }
}
export class BuildError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "BuildError"
        });
        Object.setPrototypeOf(this, BuildError.prototype);
    }
}
export class MigrationError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "MigrationError"
        });
        Object.setPrototypeOf(this, MigrationError.prototype);
    }
}
// Non-retryable database errors
export class UniqueConstraintError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "UniqueConstraintError"
        });
        Object.setPrototypeOf(this, UniqueConstraintError.prototype);
    }
}
export class NotNullConstraintError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "NotNullConstraintError"
        });
        Object.setPrototypeOf(this, NotNullConstraintError.prototype);
    }
}
export class InvalidStoreAccessError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "InvalidStoreAccessError"
        });
        Object.setPrototypeOf(this, InvalidStoreAccessError.prototype);
    }
}
export class RecordNotFoundError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "RecordNotFoundError"
        });
        Object.setPrototypeOf(this, RecordNotFoundError.prototype);
    }
}
export class CheckConstraintError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "CheckConstraintError"
        });
        Object.setPrototypeOf(this, CheckConstraintError.prototype);
    }
}
// Retryable database errors
export class DbConnectionError extends RetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "DbConnectionError"
        });
        Object.setPrototypeOf(this, DbConnectionError.prototype);
    }
}
export class TransactionStatementError extends RetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "TransactionStatementError"
        });
        Object.setPrototypeOf(this, TransactionStatementError.prototype);
    }
}
export class CopyFlushError extends RetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "CopyFlushError"
        });
        Object.setPrototypeOf(this, CopyFlushError.prototype);
    }
}
export class InvalidEventAccessError extends RetryableError {
    constructor(key, message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "InvalidEventAccessError"
        });
        Object.defineProperty(this, "key", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.setPrototypeOf(this, InvalidEventAccessError.prototype);
        this.key = key;
    }
}
// Non-retryable indexing store errors
export class InvalidStoreMethodError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "InvalidStoreMethodError"
        });
        Object.setPrototypeOf(this, InvalidStoreMethodError.prototype);
    }
}
export class UndefinedTableError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "UndefinedTableError"
        });
        Object.setPrototypeOf(this, UndefinedTableError.prototype);
    }
}
export class BigIntSerializationError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "BigIntSerializationError"
        });
        Object.setPrototypeOf(this, BigIntSerializationError.prototype);
    }
}
export class DelayedInsertError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "DelayedInsertError"
        });
        Object.setPrototypeOf(this, DelayedInsertError.prototype);
    }
}
export class RawSqlError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "RawSqlError"
        });
        Object.setPrototypeOf(this, RawSqlError.prototype);
    }
}
export class IndexingFunctionError extends NonRetryableUserError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "IndexingFunctionError"
        });
        Object.setPrototypeOf(this, IndexingFunctionError.prototype);
    }
}
export class RpcProviderError extends BaseError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "RpcProviderError"
        });
        Object.setPrototypeOf(this, RpcProviderError.prototype);
    }
}
export const nonRetryableUserErrorNames = [
    ShutdownError,
    BuildError,
    MigrationError,
    UniqueConstraintError,
    NotNullConstraintError,
    InvalidStoreAccessError,
    RecordNotFoundError,
    CheckConstraintError,
    InvalidStoreMethodError,
    UndefinedTableError,
    BigIntSerializationError,
    DelayedInsertError,
    RawSqlError,
    IndexingFunctionError,
].map((err) => err.name);
//# sourceMappingURL=errors.js.map