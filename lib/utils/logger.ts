/**
 * Production-safe logging utility
 * 
 * In production:
 * - Logs only errors and warnings
 * - Debug/info logs are suppressed
 * 
 * In development:
 * - All logs are enabled
 * 
 * Future: Can be extended to integrate with error tracking services (Sentry, LogRocket, etc.)
 */

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

export interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Creates a logger instance with optional context
 */
export function createLogger(context?: string): Logger {
  const prefix = context ? `[${context}]` : '';
  
  return {
    debug: (...args: any[]) => {
      if (isDev) {
        console.debug(prefix, ...args);
      }
    },
    info: (...args: any[]) => {
      if (isDev) {
        console.info(prefix, ...args);
      }
    },
    warn: (...args: any[]) => {
      // Always log warnings, even in production
      if (prefix) {
        console.warn(prefix, ...args);
      } else {
        console.warn(...args);
      }
    },
    error: (...args: any[]) => {
      // Always log errors, even in production
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      if (prefix) {
        console.error(prefix, ...args);
      } else {
        console.error(...args);
      }
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Server-side logger (for API routes and server components)
 * Can be extended to send logs to external services
 */
export const serverLogger = {
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug('[SERVER]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info('[SERVER]', ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn('[SERVER]', ...args);
    // TODO: Send to monitoring service
  },
  error: (...args: any[]) => {
    console.error('[SERVER]', ...args);
    // TODO: Send to error tracking service (Sentry, etc.)
  },
};

