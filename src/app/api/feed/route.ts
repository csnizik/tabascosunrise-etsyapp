/**
 * Feed API Route
 * Serves the Facebook catalog CSV from Blob storage
 *
 * GET /api/feed
 * - Returns CSV with Content-Type: text/csv; charset=utf-8
 * - Cache-Control: public, max-age=3600 (1 hour)
 * - CORS headers for Facebook access
 * - Returns 404 if no CSV available
 * - Returns 500 if Blob fetch fails
 *
 * This endpoint is public and does not require authentication.
 * Facebook will poll this URL periodically to sync the product catalog.
 */

import { NextResponse } from 'next/server';
import { getCSV } from '@/lib/storage/blob';
import { logInfo, logError } from '@/lib/utils/logger';
import { StorageError, toPublicError } from '@/lib/utils/errors';

/**
 * Common CORS headers for cross-origin access
 * Allow all origins since Facebook's catalog fetch may come from various domains
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET handler for feed endpoint
 * Serves the Facebook catalog CSV from Blob storage
 */
export async function GET(): Promise<Response> {
  logInfo('Feed access requested');

  try {
    // Fetch CSV from Blob storage
    const result = await getCSV();

    // Return 404 if no CSV exists yet
    if (!result) {
      logInfo('Feed not found - no CSV available');
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'No catalog feed available. Please run a sync first.',
            code: 'FEED_NOT_FOUND',
          },
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    logInfo('Feed served successfully', {
      size: result.content.length,
      uploadedAt: result.uploadedAt.toISOString(),
    });

    // Return CSV with appropriate headers
    return new Response(result.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders,
      },
    });
  } catch (error) {
    logError('Feed access failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof StorageError ? error.code : undefined,
    });

    const publicError = toPublicError(error);

    return NextResponse.json(
      {
        success: false,
        error: publicError,
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
