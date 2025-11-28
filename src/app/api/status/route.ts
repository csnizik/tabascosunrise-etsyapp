/**
 * Status API Route
 * Returns authentication status, last sync metadata, and feed URL
 *
 * GET /api/status
 * - Returns auth status (connected/not connected)
 * - Returns last sync metadata from Edge Config
 * - Returns feed URL if available
 */

import { NextResponse } from 'next/server';
import {
  getEtsyTokens,
  isTokenExpired,
  getSyncMetadata,
} from '@/lib/storage/edge-config';
import { logInfo, logError } from '@/lib/utils/logger';
import { StorageError, toPublicError, isEdgeConfigNotConfigured } from '@/lib/utils/errors';

/**
 * Status response type
 */
export interface StatusResponse {
  authenticated: boolean;
  tokenExpired?: boolean;
  shopId?: string;
  sync?: {
    lastSyncTime: string;
    status: 'success' | 'failure';
    listingsCount: number;
    feedUrl?: string;
  };
}

/**
 * GET handler for status endpoint
 * Returns current auth status, sync metadata, and feed URL
 */
export async function GET(): Promise<NextResponse> {
  try {
    logInfo('Fetching status');

    const response: StatusResponse = {
      authenticated: false,
    };

    // Get auth status by checking for tokens
    // Handle case where Edge Config is not configured (returns null)
    try {
      const tokens = await getEtsyTokens();
      if (tokens) {
        response.authenticated = true;
        response.tokenExpired = isTokenExpired(tokens);
        response.shopId = tokens.shop_id;
      }
    } catch (error) {
      if (isEdgeConfigNotConfigured(error)) {
        logInfo('Edge Config not configured, treating as not authenticated');
      } else {
        throw error;
      }
    }

    // Get sync metadata
    // Handle case where Edge Config is not configured
    try {
      const syncMetadata = await getSyncMetadata();
      if (syncMetadata) {
        response.sync = {
          lastSyncTime: syncMetadata.timestamp,
          status: syncMetadata.status,
          listingsCount: syncMetadata.listingsCount,
          feedUrl: syncMetadata.feedUrl,
        };
      }
    } catch (error) {
      if (isEdgeConfigNotConfigured(error)) {
        logInfo('Edge Config not configured, skipping sync metadata');
      } else {
        throw error;
      }
    }

    logInfo('Status fetched successfully', {
      authenticated: response.authenticated,
      hasSyncMetadata: !!response.sync,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logError('Failed to fetch status', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const statusCode = error instanceof StorageError ? 503 : 500;
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
