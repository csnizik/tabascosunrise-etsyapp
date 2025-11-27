/**
 * Logging utility for consistent timestamped console output
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Formats a log message with timestamp and level
 */
function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextString = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextString}`;
}

/**
 * Logs an informational message
 */
export function logInfo(message: string, context?: LogContext): void {
  console.log(formatLogMessage('INFO', message, context));
}

/**
 * Logs a warning message
 */
export function logWarn(message: string, context?: LogContext): void {
  console.warn(formatLogMessage('WARN', message, context));
}

/**
 * Logs an error message
 */
export function logError(message: string, context?: LogContext): void {
  console.error(formatLogMessage('ERROR', message, context));
}
