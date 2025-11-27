/**
 * Shared type definitions for the application
 * Domain-specific types are located in their respective lib directories:
 * - Etsy types: @/lib/etsy/types
 * - Facebook types: @/lib/facebook/types
 */

// Re-export domain-specific types for convenience
export type { EtsyPrice, EtsyImage, EtsyListing, EtsyTokens } from '@/lib/etsy/types';
export type { FacebookProduct } from '@/lib/facebook/types';

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
