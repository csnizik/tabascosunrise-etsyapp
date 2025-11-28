/**
 * Shared type definitions for the application
 * Domain-specific types are located in their respective lib directories:
 * - Etsy types: @/lib/etsy/types
 * - Facebook types: @/lib/facebook/types
 */

// Re-export domain-specific types for convenience
export type {
  EtsyPrice,
  EtsyImage,
  EtsyListing,
  EtsyShop,
  EtsyListingsResponse,
  EtsyTokens,
  RateLimitState,
} from '@/lib/etsy/types';
export type {
  FacebookProduct,
  FacebookAvailability,
  FacebookCondition,
} from '@/lib/facebook/types';

/**
 * Sync status type definitions
 */

/**
 * Current status of a sync operation
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Result of a sync operation
 * @property status - Current sync status
 * @property lastSyncTime - ISO 8601 timestamp of last successful sync
 * @property listingsCount - Number of listings synced
 * @property error - Error message if status is 'error'
 */
export interface SyncResult {
  status: SyncStatus;
  lastSyncTime?: string;
  listingsCount?: number;
  error?: string;
}

/**
 * Sync metadata stored in Edge Config
 * Tracks the last sync operation status
 * @property timestamp - ISO 8601 timestamp when sync was performed
 * @property status - Whether the sync succeeded or failed
 * @property listingsCount - Number of listings synced
 * @property feedUrl - Public URL of the uploaded CSV feed
 */
export interface SyncMetadata {
  timestamp: string;
  status: 'success' | 'failure';
  listingsCount: number;
  feedUrl?: string;
}

/**
 * Sync statistics returned by the sync endpoint
 * @property listingsCount - Number of listings synced
 * @property timestamp - ISO 8601 timestamp when sync completed
 * @property duration - Time taken for sync in milliseconds
 */
export interface SyncStats {
  listingsCount: number;
  timestamp: string;
  duration: number;
}

/**
 * Success response from the manual sync endpoint
 * @property success - Always true for success responses
 * @property feedUrl - Public URL of the uploaded CSV feed
 * @property stats - Sync statistics
 */
export interface ManualSyncResponse {
  success: true;
  feedUrl: string;
  stats: SyncStats;
}

/**
 * Standard API response wrapper
 * @template T - Type of the response data
 * @property success - Whether the request succeeded
 * @property data - Response payload (only present on success)
 * @property error - Error details (only present on failure)
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
