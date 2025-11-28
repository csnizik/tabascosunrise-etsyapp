/**
 * Manual Sync Route
 * Orchestrates the complete sync process:
 * 1. Validate authentication (user must have valid tokens)
 * 2. Fetch shop details from Etsy
 * 3. Fetch all active listings from Etsy (handles pagination)
 * 4. Transform listings to Facebook CSV format
 * 5. Upload CSV to Blob storage
 * 6. Store sync metadata in Edge Config
 * 7. Return success response with feed URL and sync stats
 *
 * POST /api/sync/manual
 */

import { NextResponse } from 'next/server';
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
  AppError,
  toPublicError,
} from '@/lib/utils/errors';
import type { ManualSyncResponse } from '@/types';

/**
 * POST handler for manual sync
 * Triggers a complete sync of Etsy listings to Facebook catalog CSV
 */
export async function POST(): Promise<NextResponse> {
  const startTime = Date.now();

  logInfo('Manual sync started');

  try {
    // Step 1: Validate authentication - ensure user has valid tokens
    logInfo('Step 1: Validating authentication');
    const tokens = await getValidToken();
    logInfo('Authentication validated', { userId: tokens.user_id });

    // Step 2: Create Etsy client and fetch shop details
    logInfo('Step 2: Fetching shop details');
    const client = new EtsyClient();

    // Get shop ID from tokens or use the user ID to fetch it
    // The user_id from the token can be used to get the shop
    // We need to get the shop ID first if not stored
    let shopId = tokens.shop_id;

    if (!shopId) {
      // If shop_id is not stored, we need to use a different approach
      // For now, we'll use the user_id as the shop_id
      // In a real scenario, you might need to fetch the shop by user
      logInfo('No shop_id stored, using user_id as shop identifier', {
        userId: tokens.user_id,
      });
      shopId = tokens.user_id;
    }

    const shop = await client.getShopDetails(shopId);
    logInfo('Shop details fetched', {
      shopId: shop.shop_id,
      shopName: shop.shop_name,
      activeListingCount: shop.listing_active_count,
    });

    // Step 3: Fetch all active listings from Etsy
    logInfo('Step 3: Fetching active listings');
    const listings = await client.getShopListings(shop.shop_id.toString());
    logInfo('Listings fetched', { count: listings.length });

    // Step 4: Transform listings to Facebook CSV format
    logInfo('Step 4: Transforming listings to CSV');
    const csvContent = formatListingsToCSV(listings, shop.shop_name);
    logInfo('CSV generated', {
      contentLength: csvContent.length,
      listingsCount: listings.length,
    });

    // Step 5: Upload CSV to Blob storage
    logInfo('Step 5: Uploading CSV to Blob storage');
    const feedUrl = await uploadCSV(csvContent);
    logInfo('CSV uploaded', { feedUrl });

    // Calculate sync duration
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    // Step 6: Store sync metadata in Edge Config
    logInfo('Step 6: Storing sync metadata');
    await storeSyncMetadata({
      timestamp,
      status: 'success',
      listingsCount: listings.length,
      feedUrl,
    });
    logInfo('Sync metadata stored');

    // Step 7: Return success response
    const response: ManualSyncResponse = {
      success: true,
      feedUrl,
      stats: {
        listingsCount: listings.length,
        timestamp,
        duration,
      },
    };

    logInfo('Manual sync completed successfully', {
      listingsCount: listings.length,
      duration: `${duration}ms`,
      feedUrl,
    });

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;

    logError('Manual sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof AppError ? error.code : undefined,
      duration: `${duration}ms`,
    });

    // Store failure metadata
    try {
      await storeSyncMetadata({
        timestamp: new Date().toISOString(),
        status: 'failure',
        listingsCount: 0,
      });
    } catch (metadataError) {
      logError('Failed to store failure metadata', {
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
    }

    const publicError = toPublicError(error);

    return NextResponse.json(
      {
        success: false,
        error: publicError,
      },
      { status: statusCode }
    );
  }
}

/**
 * GET handler - returns method not allowed
 * Use POST to trigger a sync
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Method not allowed. Use POST to trigger a sync.',
        code: 'METHOD_NOT_ALLOWED',
      },
    },
    { status: 405 }
  );
}
