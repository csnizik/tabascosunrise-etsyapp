/**
 * Feed Statistics API Route
 * Returns metadata about the current feed without serving the full content
 *
 * GET /api/feed/stats
 * - Returns product count, size, upload timestamp
 * - Useful for monitoring and debugging
 */

import { NextResponse } from 'next/server';
import { getCSV } from '@/lib/storage/blob';
import { logInfo, logError } from '@/lib/utils/logger';
import { StorageError, toPublicError } from '@/lib/utils/errors';

/**
 * CORS headers for cross-origin access
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
 * GET handler for feed statistics
 * Returns metadata about the current feed
 */
export async function GET(): Promise<Response> {
  logInfo('Feed stats requested');

  try {
    const result = await getCSV();

    if (!result) {
      return NextResponse.json(
        {
          success: true,
          data: {
            exists: false,
          },
        },
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // Count products (lines minus header)
    const lines = result.content.split('\n').filter((line) => line.trim().length > 0);
    const productCount = Math.max(0, lines.length - 1); // Exclude header row

    logInfo('Feed stats served', {
      productCount,
      sizeBytes: result.content.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          exists: true,
          productCount,
          sizeBytes: result.content.length,
          uploadedAt: result.uploadedAt.toISOString(),
          url: result.url,
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    logError('Feed stats failed', {
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
