/**
 * Custom error classes for the application
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * OAuth-related errors
 */
export class OAuthError extends AppError {
  constructor(message: string, code: string = 'OAUTH_ERROR') {
    super(message, code, 401);
    this.name = 'OAuthError';
    Object.setPrototypeOf(this, OAuthError.prototype);
  }
}

/**
 * Token-related errors (expired, invalid, missing)
 */
export class TokenError extends AppError {
  constructor(message: string, code: string = 'TOKEN_ERROR') {
    super(message, code, 401);
    this.name = 'TokenError';
    Object.setPrototypeOf(this, TokenError.prototype);
  }
}

/**
 * Etsy API errors
 */
export class EtsyApiError extends AppError {
  constructor(
    message: string,
    code: string = 'ETSY_API_ERROR',
    statusCode: number = 500
  ) {
    super(message, code, statusCode);
    this.name = 'EtsyApiError';
    Object.setPrototypeOf(this, EtsyApiError.prototype);
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends EtsyApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Configuration errors (missing env vars, etc.)
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 500);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * Storage errors (Edge Config, Blob storage)
 */
export class StorageError extends AppError {
  constructor(message: string, code: string = 'STORAGE_ERROR') {
    super(message, code, 500);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}
