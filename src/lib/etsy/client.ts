/**
 * Etsy API client with automatic token validation and refresh
 * Handles authentication, rate limiting, and provides methods for Etsy API calls
 */

import { TokenError, EtsyApiError, RateLimitError, ConfigError, StorageError } from '@/lib/utils/errors';
import { logInfo, logError, logWarn } from '@/lib/utils/logger';
import {
  getEtsyTokens,
  isTokenExpired,
  refreshAccessToken,
  getRateLimitState,
  storeRateLimitState,
} from '@/lib/storage/edge-config';
import type {
  EtsyTokens,
  EtsyListing,
  EtsyShop,
  EtsyImage,
  EtsyListingsResponse,
  EtsyShopsResponse,
  RateLimitState,
} from '@/lib/etsy/types';

/**
 * Rate limit configuration
 */
const RATE_LIMIT = {
  /** Maximum requests per second */
  QPS: 5,
  /** Maximum requests per day */
  QPD: 5000,
  /** Time window in milliseconds for QPS tracking */
  SECOND_WINDOW_MS: 1000,
  /** Buffer time in milliseconds added when waiting for rate limit window */
  BUFFER_MS: 10,
};

/**
 * Retry configuration for transient errors
 */
const RETRY_CONFIG = {
  /** Maximum number of retries */
  MAX_RETRIES: 3,
  /** Base delay in milliseconds for exponential backoff */
  BASE_DELAY_MS: 1000,
  /** Maximum delay in milliseconds */
  MAX_DELAY_MS: 30000,
  /** Maximum jitter factor (percentage of delay to add as randomness) */
  JITTER_FACTOR: 0.3,
};

/**
 * Etsy API base URL
 */
const ETSY_API_BASE = 'https://api.etsy.com/v3';

/**
 * Default pagination limit for listings
 */
const DEFAULT_LIMIT = 100;

/**
 * Gets a valid Etsy access token, refreshing if necessary
 * This function ensures that API calls always have a valid token by:
 * 1. Retrieving stored tokens from Edge Config
 * 2. Checking if the token is expired or will expire within 5 minutes
 * 3. Refreshing the token if needed
 *
 * @returns Valid Etsy tokens with an unexpired access_token
 * @throws TokenError if no tokens are stored (user needs to authorize)
 * @throws TokenError if refresh token has expired (90 days) requiring re-authorization
 * @example
 * const tokens = await getValidToken();
 * // Use tokens.access_token and tokens.user_id for API calls
 */
export async function getValidToken(): Promise<EtsyTokens> {
  // Retrieve stored tokens
  const tokens = await getEtsyTokens();

  if (!tokens) {
    logError('No Etsy tokens found - authorization required');
    throw new TokenError(
      'Not authorized with Etsy. Please complete the authorization flow.',
      'NOT_AUTHORIZED'
    );
  }

  // Check if token is still valid
  if (!isTokenExpired(tokens)) {
    logInfo('Using existing valid access token', {
      expires_at: tokens.expires_at,
    });
    return tokens;
  }

  // Token is expired or will expire soon - refresh it
  logInfo('Access token expired or expiring soon, refreshing');

  try {
    const refreshedTokens = await refreshAccessToken(tokens);
    return refreshedTokens;
  } catch (error) {
    // Check if this is a refresh token expiration
    if (error instanceof StorageError && error.code === 'REFRESH_TOKEN_EXPIRED') {
      throw new TokenError(
        'Etsy authorization has expired (refresh token expired). Please re-authorize.',
        'REFRESH_TOKEN_EXPIRED'
      );
    }

    logError('Failed to refresh access token', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new TokenError(
      'Failed to refresh Etsy access token. Please try again or re-authorize.',
      'TOKEN_REFRESH_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Initialize rate limit state if not present
 * @returns Current or new rate limit state
 */
async function getOrCreateRateLimitState(): Promise<RateLimitState> {
  let state = await getRateLimitState();

  const now = new Date();
  // Calculate next midnight UTC (tomorrow at 00:00:00 UTC) for daily reset
  const nextMidnightUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  );

  // Initialize if not exists
  if (!state) {
    state = {
      daily_count: 0,
      daily_reset: nextMidnightUTC.toISOString(),
      second_timestamps: [],
    };
    await storeRateLimitState(state);
    return state;
  }

  // Reset daily count if we're past midnight UTC
  const resetTime = new Date(state.daily_reset);
  if (now >= resetTime) {
    state = {
      daily_count: 0,
      daily_reset: nextMidnightUTC.toISOString(),
      second_timestamps: [],
    };
    await storeRateLimitState(state);
    logInfo('Daily rate limit counter reset');
  }

  return state;
}

/**
 * Clean up old timestamps outside the current second window
 * @param timestamps - Array of request timestamps
 * @returns Filtered timestamps within the current window
 */
function cleanupTimestamps(timestamps: number[]): number[] {
  const now = Date.now();
  return timestamps.filter((ts) => now - ts < RATE_LIMIT.SECOND_WINDOW_MS);
}

/**
 * Wait for rate limit to allow the next request
 * Implements token bucket algorithm for QPS limiting
 * @throws RateLimitError if daily limit exceeded
 */
async function waitForRateLimit(): Promise<void> {
  const state = await getOrCreateRateLimitState();

  // Check daily limit
  if (state.daily_count >= RATE_LIMIT.QPD) {
    const resetTime = new Date(state.daily_reset);
    const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));
    throw new RateLimitError(
      `Daily rate limit exceeded (${RATE_LIMIT.QPD} requests). Resets in ~${hoursUntilReset} hours.`
    );
  }

  // Clean up old timestamps
  const currentTimestamps = cleanupTimestamps(state.second_timestamps);

  // If at QPS limit, wait for the oldest request to expire
  if (currentTimestamps.length >= RATE_LIMIT.QPS) {
    const oldestTimestamp = Math.min(...currentTimestamps);
    const waitTime = RATE_LIMIT.SECOND_WINDOW_MS - (Date.now() - oldestTimestamp);

    if (waitTime > 0) {
      logInfo('Rate limit: waiting for QPS window', { waitTimeMs: waitTime });
      await delay(waitTime + RATE_LIMIT.BUFFER_MS);
    }
  }

  // Update state with new request timestamp
  const currentTimestamp = Date.now();
  const newTimestamps = cleanupTimestamps([...state.second_timestamps, currentTimestamp]);

  await storeRateLimitState({
    ...state,
    daily_count: state.daily_count + 1,
    second_timestamps: newTimestamps,
  });

  logInfo('Rate limit state updated', {
    daily_count: state.daily_count + 1,
    qps_current: newTimestamps.length,
  });
}

/**
 * Utility function to delay execution
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for exponential backoff
 * @param attempt - Current retry attempt (0-based)
 * @returns Delay in milliseconds with jitter
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * RETRY_CONFIG.JITTER_FACTOR * exponentialDelay;
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * Check if an error is retryable
 * @param status - HTTP status code
 * @returns Whether the error should be retried
 */
function isRetryableError(status: number): boolean {
  // Retry on rate limit (429) and server errors (5xx)
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Validate and sanitize a shop ID for use in API endpoints
 * Etsy shop IDs are numeric strings
 * @param shopId - The shop ID to validate
 * @returns The validated shop ID
 * @throws EtsyApiError if the shop ID is invalid
 */
function validateShopId(shopId: string): string {
  // Trim whitespace
  const trimmed = shopId.trim();

  // Check if empty
  if (!trimmed) {
    throw new EtsyApiError('Shop ID cannot be empty', 'INVALID_SHOP_ID', 400);
  }

  // Etsy shop IDs are numeric - validate format
  if (!/^\d+$/.test(trimmed)) {
    throw new EtsyApiError(
      `Invalid shop ID format: "${shopId}". Shop ID must be a numeric string.`,
      'INVALID_SHOP_ID',
      400
    );
  }

  return trimmed;
}

/**
 * Validate and sanitize a shop name for use in API endpoints
 * @param shopName - The shop name to validate
 * @returns The validated and trimmed shop name
 * @throws EtsyApiError if the shop name is invalid
 */
function validateShopName(shopName: string): string {
  // Trim whitespace
  const trimmed = shopName.trim();

  // Check if empty
  if (!trimmed) {
    throw new EtsyApiError('Shop name cannot be empty', 'INVALID_SHOP_NAME', 400);
  }

  return trimmed;
}

/**
 * Etsy API Client with rate limiting and automatic token refresh
 * Provides methods for fetching shop listings and details
 *
 * @example
 * const client = new EtsyClient();
 * const listings = await client.getShopListings('12345');
 * const shop = await client.getShopDetails('12345');
 */
export class EtsyClient {
  private apiKey: string;

  /**
   * Creates a new EtsyClient instance
   * @throws ConfigError if ETSY_API_KEY is not set
   */
  constructor() {
    const apiKey = process.env.ETSY_API_KEY;
    if (!apiKey) {
      throw new ConfigError('ETSY_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  /**
   * Make a request to the Etsy API with automatic token refresh,
   * rate limiting, and retry logic
   *
   * @template T - Expected response type
   * @param endpoint - API endpoint (without base URL)
   * @returns Parsed JSON response
   * @throws EtsyApiError on API errors
   * @throws TokenError on authentication failures
   * @throws RateLimitError if rate limit exceeded
   *
   * @example
   * const response = await client.makeRequest<EtsyShop>('/application/shops/12345');
   */
  async makeRequest<T>(endpoint: string): Promise<T> {
    // Get valid token (refreshes if needed)
    const tokens = await getValidToken();

    // Wait for rate limit
    await waitForRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const url = `${ETSY_API_BASE}${endpoint}`;

        logInfo('Making Etsy API request', {
          endpoint,
          attempt: attempt > 0 ? attempt : undefined,
        });

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        // Log response status
        logInfo('Etsy API response received', {
          endpoint,
          status: response.status,
        });

        // Handle non-success responses
        if (!response.ok) {
          const errorText = await response.text();
          let errorBody: unknown;
          try {
            errorBody = JSON.parse(errorText);
          } catch {
            errorBody = errorText;
          }

          logError('Etsy API error response', {
            endpoint,
            status: response.status,
            error: errorBody,
          });

          // Check if retryable
          if (isRetryableError(response.status) && attempt < RETRY_CONFIG.MAX_RETRIES) {
            const backoffDelay = calculateBackoffDelay(attempt);
            logWarn('Retryable error, backing off', {
              endpoint,
              status: response.status,
              attempt,
              backoffMs: backoffDelay,
            });
            await delay(backoffDelay);
            continue;
          }

          // Rate limit specific error
          if (response.status === 429) {
            throw new RateLimitError(
              `Etsy API rate limit exceeded. Endpoint: ${endpoint}`
            );
          }

          // Authentication error
          if (response.status === 401 || response.status === 403) {
            throw new TokenError(
              `Authentication failed for Etsy API. Status: ${response.status}`,
              'API_AUTH_FAILED'
            );
          }

          // Other API errors
          throw new EtsyApiError(
            `Etsy API request failed. Status: ${response.status}, Endpoint: ${endpoint}`,
            'API_REQUEST_FAILED',
            response.status
          );
        }

        // Parse and return successful response
        const data: T = await response.json();

        logInfo('Etsy API request successful', { endpoint });

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry non-retryable errors
        if (
          error instanceof TokenError ||
          error instanceof RateLimitError ||
          (error instanceof EtsyApiError && !isRetryableError(error.statusCode))
        ) {
          throw error;
        }

        // Network errors - retry with backoff
        if (attempt < RETRY_CONFIG.MAX_RETRIES) {
          const backoffDelay = calculateBackoffDelay(attempt);
          logWarn('Network error, retrying with backoff', {
            endpoint,
            attempt,
            backoffMs: backoffDelay,
            error: lastError.message,
          });
          await delay(backoffDelay);
          continue;
        }

        // Max retries exhausted
        logError('Max retries exhausted for Etsy API request', {
          endpoint,
          error: lastError.message,
        });
      }
    }

    // This should only be reached if all retries failed
    throw new EtsyApiError(
      `Etsy API request failed after ${RETRY_CONFIG.MAX_RETRIES} retries. Endpoint: ${endpoint}`,
      'MAX_RETRIES_EXCEEDED',
      503,
      lastError ?? undefined
    );
  }

  /**
   * Fetch all active listings for a shop with pagination support
   * Automatically handles pagination for shops with more than 100 listings
   *
   * @param shopId - Etsy shop ID (numeric string)
   * @returns Array of all active listings
   * @throws EtsyApiError on API errors or invalid shop ID
   *
   * @example
   * const client = new EtsyClient();
   * const listings = await client.getShopListings('12345');
   * console.log(`Found ${listings.length} listings`);
   */
  async getShopListings(shopId: string): Promise<EtsyListing[]> {
    const validatedShopId = validateShopId(shopId);
    const allListings: EtsyListing[] = [];
    let offset = 0;
    let hasMore = true;

    logInfo('Fetching shop listings', { shopId: validatedShopId });

    while (hasMore) {
      const endpoint = `/application/shops/${validatedShopId}/listings/active?limit=${DEFAULT_LIMIT}&offset=${offset}&includes=images`;

      const response = await this.makeRequest<EtsyListingsResponse>(endpoint);

      allListings.push(...response.results);

      logInfo('Fetched listings page', {
        shopId: validatedShopId,
        offset,
        count: response.results.length,
        total: response.count,
      });

      // Check if there are more pages
      if (response.results.length < DEFAULT_LIMIT) {
        hasMore = false;
      } else {
        offset += DEFAULT_LIMIT;
      }

      // Safety check to prevent infinite loops
      if (offset >= response.count) {
        hasMore = false;
      }
    }

    logInfo('Finished fetching all listings', {
      shopId: validatedShopId,
      totalListings: allListings.length,
    });

    return allListings;
  }

  /**
   * Fetch shop details
   *
   * @param shopId - Etsy shop ID (numeric string)
   * @returns Shop details object
   * @throws EtsyApiError on API errors or invalid shop ID
   *
   * @example
   * const client = new EtsyClient();
   * const shop = await client.getShopDetails('12345');
   * console.log(`Shop name: ${shop.shop_name}`);
   */
  async getShopDetails(shopId: string): Promise<EtsyShop> {
    const validatedShopId = validateShopId(shopId);

    logInfo('Fetching shop details', { shopId: validatedShopId });

    const endpoint = `/application/shops/${validatedShopId}`;
    const response = await this.makeRequest<EtsyShop>(endpoint);

    logInfo('Shop details fetched successfully', {
      shopId: validatedShopId,
      shopName: response.shop_name,
    });

    return response;
  }

  /**
   * Fetch images for multiple listings using batched API calls
   * Uses getListingsByListingIds endpoint with includes=Images parameter
   *
   * @param listingIds - Array of listing IDs to fetch images for
   * @returns Map of listing_id -> sorted EtsyImage[] (sorted by rank)
   *
   * @example
   * const client = new EtsyClient();
   * const imageMap = await client.getListingsWithImages([123, 456, 789]);
   * const images = imageMap.get(123); // Array of images for listing 123
   */
  async getListingsWithImages(listingIds: number[]): Promise<Map<number, EtsyImage[]>> {
    const imagesByListingId = new Map<number, EtsyImage[]>();

    // Return empty map if no listing IDs provided
    if (!listingIds || listingIds.length === 0) {
      logInfo('No listing IDs provided for image fetching');
      return imagesByListingId;
    }

    logInfo('Fetching images for listings', {
      totalListings: listingIds.length,
      batches: Math.ceil(listingIds.length / 100),
    });

    // Batch into groups of 100 (Etsy API limit)
    for (let i = 0; i < listingIds.length; i += 100) {
      const batch = listingIds.slice(i, i + 100);
      const listingIdsParam = batch.join(',');

      logInfo('Fetching image batch', {
        batchNumber: Math.floor(i / 100) + 1,
        batchSize: batch.length,
      });

      const endpoint = `/application/listings/batch?listing_ids=${listingIdsParam}&includes=Images`;

      try {
        const response = await this.makeRequest<{
          count: number;
          results: Array<{
            listing_id: number;
            images?: EtsyImage[];
          }>;
        }>(endpoint);

        logInfo('Image batch received', {
          listingsWithImages: response.results.filter((l) => l.images?.length).length,
          totalListings: response.results.length,
        });

        // Build Map for efficient lookup
        response.results.forEach((listing) => {
          if (listing.images && listing.images.length > 0) {
            // Sort by rank and limit to first 9 images
            const sortedImages = listing.images
              .sort((a, b) => a.rank - b.rank)
              .slice(0, 9);
            imagesByListingId.set(listing.listing_id, sortedImages);
          }
        });
      } catch (error) {
        logError('Failed to fetch image batch', {
          batchNumber: Math.floor(i / 100) + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }

    logInfo('Image fetching complete', {
      totalListings: listingIds.length,
      listingsWithImages: imagesByListingId.size,
    });

    return imagesByListingId;
  }

  /**
   * Fetch a shop by name
   * Uses the findShops endpoint to search for a shop by exact name
   *
   * @param shopName - Etsy shop name to search for
   * @returns Shop details object
   * @throws EtsyApiError if shop is not found or on API errors
   *
   * @example
   * const client = new EtsyClient();
   * const shop = await client.getShopByName('TabascoSunrise');
   * console.log(`Shop ID: ${shop.shop_id}`);
   */
  async getShopByName(shopName: string): Promise<EtsyShop> {
    logInfo('Fetching shop by name', { shopName });

    // Validate shop name
    const trimmedShopName = validateShopName(shopName);
    // Encode the shop name for URL safety
    const encodedShopName = encodeURIComponent(trimmedShopName);
    const endpoint = `/application/shops?shop_name=${encodedShopName}`;
    const response = await this.makeRequest<EtsyShopsResponse>(endpoint);

    // Check if any shops were found
    if (!response.results || response.results.length === 0) {
      throw new EtsyApiError(
        `No shop found with name "${shopName}"`,
        'NO_SHOPS_FOUND',
        404
      );
    }

    /**
     * The Etsy API's /application/shops?shop_name=... endpoint may return multiple shops
     * with similar names, not just an exact match. To ensure we return the correct shop,
     * we perform a case-insensitive exact match on shop_name. If no exact match is found,
     * we throw an error. This avoids returning a shop with a similar but incorrect name.
     */
    const shop = response.results.find(
      (s) => s.shop_name.toLowerCase() === shopName.toLowerCase()
    );

    if (!shop) {
      logError('No exact shop name match found', {
        requestedName: shopName,
        foundShops: response.results.map((s) => s.shop_name),
      });
      throw new EtsyApiError(
        `No shop found with exact name "${shopName}". Found similar: ${response.results
          .map((s) => s.shop_name)
          .join(', ')}`,
        'NO_EXACT_MATCH',
        404
      );
    }

    logInfo('Shop fetched by name successfully', {
      shopName,
      shopId: shop.shop_id,
      totalResults: response.count,
      exactMatch: shop.shop_name === shopName,
    });

    return shop;
  }
}
