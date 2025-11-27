/**
 * Custom error classes for the application
 * Provides typed errors with codes for consistent error handling
 */

/**
 * Base application error class
 * All custom errors should extend this class
 * @example
 * throw new AppError('Something went wrong', 'CUSTOM_ERROR', 400);
 */
export class AppError extends Error {
  /**
   * Creates a new AppError
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param statusCode - HTTP status code (default: 500)
   * @param cause - Optional underlying error that caused this error
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * OAuth-related errors
 * Used for authentication and authorization failures
 * @example
 * throw new OAuthError('Invalid state parameter', 'STATE_MISMATCH');
 */
export class OAuthError extends AppError {
  /**
   * Creates a new OAuthError
   * @param message - Human-readable error message
   * @param code - Machine-readable error code (default: 'OAUTH_ERROR')
   * @param cause - Optional underlying error
   */
  constructor(message: string, code: string = 'OAUTH_ERROR', cause?: Error) {
    super(message, code, 401, cause);
    this.name = 'OAuthError';
    Object.setPrototypeOf(this, OAuthError.prototype);
  }
}

/**
 * Token-related errors (expired, invalid, missing)
 * Used when token validation or refresh fails
 * @example
 * throw new TokenError('Token has expired', 'TOKEN_EXPIRED');
 */
export class TokenError extends AppError {
  /**
   * Creates a new TokenError
   * @param message - Human-readable error message
   * @param code - Machine-readable error code (default: 'TOKEN_ERROR')
   * @param cause - Optional underlying error
   */
  constructor(message: string, code: string = 'TOKEN_ERROR', cause?: Error) {
    super(message, code, 401, cause);
    this.name = 'TokenError';
    Object.setPrototypeOf(this, TokenError.prototype);
  }
}

/**
 * Etsy API errors
 * Used for failures when communicating with Etsy API
 * @example
 * throw new EtsyApiError('Failed to fetch listings', 'LISTINGS_FETCH_ERROR', 502);
 */
export class EtsyApiError extends AppError {
  /**
   * Creates a new EtsyApiError
   * @param message - Human-readable error message
   * @param code - Machine-readable error code (default: 'ETSY_API_ERROR')
   * @param statusCode - HTTP status code (default: 500)
   * @param cause - Optional underlying error
   */
  constructor(
    message: string,
    code: string = 'ETSY_API_ERROR',
    statusCode: number = 500,
    cause?: Error
  ) {
    super(message, code, statusCode, cause);
    this.name = 'EtsyApiError';
    Object.setPrototypeOf(this, EtsyApiError.prototype);
  }
}

/**
 * Rate limit exceeded error
 * Used when API rate limits are hit
 * @example
 * throw new RateLimitError('Etsy API rate limit exceeded');
 */
export class RateLimitError extends EtsyApiError {
  /**
   * Creates a new RateLimitError
   * @param message - Human-readable error message (default: 'Rate limit exceeded')
   * @param cause - Optional underlying error
   */
  constructor(message: string = 'Rate limit exceeded', cause?: Error) {
    super(message, 'RATE_LIMIT_ERROR', 429, cause);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Configuration errors (missing env vars, etc.)
 * Used when required configuration is missing or invalid
 * @example
 * throw new ConfigError('ETSY_API_KEY environment variable is required');
 */
export class ConfigError extends AppError {
  /**
   * Creates a new ConfigError
   * @param message - Human-readable error message
   * @param cause - Optional underlying error
   */
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', 500, cause);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * Storage errors (Edge Config, Blob storage)
 * Used when storage operations fail
 * @example
 * throw new StorageError('Failed to save tokens', 'EDGE_CONFIG_WRITE_ERROR');
 */
export class StorageError extends AppError {
  /**
   * Creates a new StorageError
   * @param message - Human-readable error message
   * @param code - Machine-readable error code (default: 'STORAGE_ERROR')
   * @param cause - Optional underlying error
   */
  constructor(message: string, code: string = 'STORAGE_ERROR', cause?: Error) {
    super(message, code, 500, cause);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Safely converts an error to a public-safe response object
 * Never exposes stack traces or sensitive internal details
 * @param err - Any error or unknown value
 * @returns Public-safe error object with message and optional code
 * @example
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   return Response.json(toPublicError(err), { status: 500 });
 * }
 */
export function toPublicError(err: unknown): { message: string; code?: string } {
  if (err instanceof AppError) {
    return {
      message: err.message,
      code: err.code,
    };
  }

  if (err instanceof Error) {
    return {
      message: err.message,
    };
  }

  return {
    message: 'An unexpected error occurred',
  };
}
