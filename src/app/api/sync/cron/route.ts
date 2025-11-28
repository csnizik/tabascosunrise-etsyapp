/**
 * Cron Sync Route
 * Automated daily sync triggered by Vercel Cron Jobs
 * Validates CRON_SECRET before executing the sync
 *
 * GET /api/sync/cron
 *
 * Vercel sends header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Returns 401 if secret is missing or invalid
 * Returns 200 with sync stats on success
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { EtsyClient, getValidToken } from '@/lib/etsy/client';
import { formatListingsToCSV } from '@/lib/facebook/catalog';
import { uploadCSV } from '@/lib/storage/blob';
import { storeSyncMetadata } from '@/lib/storage/edge-config';
import { logInfo, logError } from '@/lib/utils/logger';
import {
  TokenError,
  EtsyApiError,
  StorageError,
  RateLimitError,
  ConfigError,
  AppError,
  toPublicError,
} from '@/lib/utils/errors';
import type { SyncStats } from '@/types';

/**
 * Response type for cron sync endpoint
 */
interface CronSyncResponse {
  success: true;
  feedUrl: string;
  stats: SyncStats;
  trigger: 'cron';
}

/**
 * Performs a timing-safe comparison of two strings
 * Prevents timing attacks when comparing secrets
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal, false otherwise
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    // If lengths differ, compare against a same-length buffer to prevent timing leaks
    if (bufA.length !== bufB.length) {
      return timingSafeEqual(bufA, bufA) && false;
    }

    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Validates the cron secret from the Authorization header
 * Uses timing-safe comparison to prevent timing attacks
 * Note: request.headers.get() normalizes header names to lowercase
 * @param request - Incoming request
 * @returns true if valid, false otherwise
 */
function validateCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured, deny access
  if (!expectedSecret) {
    logError('CRON_SECRET environment variable is not configured');
    return false;
  }

  // If no auth header provided, deny access
  if (!authHeader) {
    return false;
  }

  // Validate the Bearer token using timing-safe comparison
  const expectedHeader = `Bearer ${expectedSecret}`;
  return safeCompare(authHeader, expectedHeader);
}

/**
 * GET handler for cron sync
 * Validates CRON_SECRET and triggers a complete sync
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const cronTimestamp = new Date().toISOString();

  logInfo('Cron sync triggered', { timestamp: cronTimestamp });

  // Validate cron secret
  if (!validateCronSecret(request)) {
    logError('Cron sync unauthorized: Invalid or missing secret', {
      timestamp: cronTimestamp,
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'CRON_UNAUTHORIZED',
        },
      },
      { status: 401 }
    );
  }

  logInfo('Cron sync authenticated successfully');

  try {
    // Step 1: Validate authentication - ensure user has valid tokens
    logInfo('Cron sync: Validating Etsy authentication');
    const tokens = await getValidToken();
    logInfo('Cron sync: Authentication validated', { userId: tokens.user_id });

    // Step 2: Create Etsy client and fetch shop details
    logInfo('Cron sync: Fetching shop details');
    const client = new EtsyClient();

    // Get shop using stored shop_id or look up by shop name
    let shop;
    if (tokens.shop_id) {
      logInfo('Cron sync: Using stored shop_id', { shopId: tokens.shop_id });
      shop = await client.getShopDetails(tokens.shop_id);
    } else {
      const shopName = process.env.ETSY_SHOP_NAME;
      if (!shopName) {
        logError('ETSY_SHOP_NAME environment variable is not set');
        throw new ConfigError(
          'ETSY_SHOP_NAME environment variable is required when shop_id is not stored'
        );
      }
      logInfo('Cron sync: No shop_id stored, fetching shop by name', {
        shopName,
      });
      shop = await client.getShopByName(shopName);
    }

    logInfo('Cron sync: Shop details fetched', {
      shopId: shop.shop_id,
      shopName: shop.shop_name,
      activeListingCount: shop.listing_active_count,
    });

    // Step 3: Fetch all active listings from Etsy
    logInfo('Cron sync: Fetching active listings');
    const listings = await client.getShopListings(shop.shop_id.toString());
    logInfo('Cron sync: Listings fetched', { count: listings.length });

    // Step 4: Transform listings to Facebook CSV format
    logInfo('Cron sync: Transforming listings to CSV');
    const csvContent = formatListingsToCSV(listings, shop.shop_name);
    logInfo('Cron sync: CSV generated', {
      contentLength: csvContent.length,
      listingsCount: listings.length,
    });

    // Step 5: Upload CSV to Blob storage
    logInfo('Cron sync: Uploading CSV to Blob storage');
    const feedUrl = await uploadCSV(csvContent);
    logInfo('Cron sync: CSV uploaded', { feedUrl });

    // Calculate sync duration
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    // Step 6: Store sync metadata in Edge Config
    logInfo('Cron sync: Storing sync metadata');
    await storeSyncMetadata({
      timestamp,
      status: 'success',
      listingsCount: listings.length,
      feedUrl,
    });
    logInfo('Cron sync: Sync metadata stored');

    // Step 7: Return success response
    const response: CronSyncResponse = {
      success: true,
      feedUrl,
      stats: {
        listingsCount: listings.length,
        timestamp,
        duration,
      },
      trigger: 'cron',
    };

    logInfo('Cron sync completed successfully', {
      listingsCount: listings.length,
      duration: `${duration}ms`,
      feedUrl,
      trigger: 'cron',
    });

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;

    logError('Cron sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof AppError ? error.code : undefined,
      duration: `${duration}ms`,
      trigger: 'cron',
    });

    // Store failure metadata
    try {
      await storeSyncMetadata({
        timestamp: new Date().toISOString(),
        status: 'failure',
        listingsCount: 0,
      });
    } catch (metadataError) {
      logError('Cron sync: Failed to store failure metadata', {
        error: metadataError instanceof Error ? metadataError.message : 'Unknown error',
      });
    }

    // Determine appropriate status code
    let statusCode = 500;
    if (error instanceof TokenError) {
      statusCode = 401;
    } else if (error instanceof RateLimitError) {
      statusCode = 429;
    } else if (error instanceof EtsyApiError) {
      statusCode = error.statusCode || 502;
    } else if (error instanceof StorageError) {
      statusCode = 503;
    } else if (error instanceof ConfigError) {
      statusCode = 500;
    }

    const publicError = toPublicError(error);

    return NextResponse.json(
      {
        success: false,
        error: publicError,
        trigger: 'cron',
      },
      { status: statusCode }
    );
  }
}
