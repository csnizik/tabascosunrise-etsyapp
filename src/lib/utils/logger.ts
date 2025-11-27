/**
 * Logging utility for consistent timestamped console output
 * Environment-aware: logging is disabled in production unless explicitly enabled
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

/**
 * Context object for structured logging
 */
interface LogContext {
  [key: string]: unknown;
}

/**
 * Check if logging is enabled based on environment
 * Logs are disabled in production unless LOG_ENABLED=true
 */
function isLoggingEnabled(): boolean {
  if (process.env.LOG_ENABLED === 'true') {
    return true;
  }
  return process.env.NODE_ENV !== 'production';
}

/**
 * Safely serializes context object to JSON string
 * @param obj - Context object to serialize
 * @returns JSON string or error message if serialization fails
 */
function safeStringify(obj: LogContext): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[Unable to serialize context]';
  }
}

/**
 * Formats a log message with timestamp and level
 * @param level - Log severity level
 * @param message - Log message
 * @param context - Optional structured context data
 * @returns Formatted log string
 */
function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextString = context ? ` ${safeStringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextString}`;
}

/**
 * Logs an informational message to the console
 * Only logs in development or when LOG_ENABLED=true
 * @param message - The message to log
 * @param context - Optional structured context data to include
 * @example
 * logInfo('User logged in', { userId: '123' });
 * // Output: [2024-01-15T10:30:00.000Z] [INFO] User logged in {"userId":"123"}
 */
export function logInfo(message: string, context?: LogContext): void {
  if (!isLoggingEnabled()) return;
  console.log(formatLogMessage('INFO', message, context));
}

/**
 * Logs a warning message to the console
 * Only logs in development or when LOG_ENABLED=true
 * @param message - The warning message to log
 * @param context - Optional structured context data to include
 * @example
 * logWarn('Rate limit approaching', { remaining: 10 });
 * // Output: [2024-01-15T10:30:00.000Z] [WARN] Rate limit approaching {"remaining":10}
 */
export function logWarn(message: string, context?: LogContext): void {
  if (!isLoggingEnabled()) return;
  console.warn(formatLogMessage('WARN', message, context));
}

/**
 * Logs an error message to the console
 * Only logs in development or when LOG_ENABLED=true
 * @param message - The error message to log
 * @param context - Optional structured context data to include
 * @example
 * logError('Failed to sync', { error: 'Connection timeout' });
 * // Output: [2024-01-15T10:30:00.000Z] [ERROR] Failed to sync {"error":"Connection timeout"}
 */
export function logError(message: string, context?: LogContext): void {
  if (!isLoggingEnabled()) return;
  console.error(formatLogMessage('ERROR', message, context));
}
