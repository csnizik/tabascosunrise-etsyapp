/**
 * Feed API Route
 * Serves the Facebook catalog CSV from Blob storage
 *
 * GET /api/feed
 * - Returns CSV with Content-Type: text/csv; charset=utf-8
 * - Cache-Control: public, max-age=3600 (1 hour)
 * - ETag support for conditional requests (304 Not Modified)
 * - Last-Modified header for cache validation
 * - Content-Length header for pre-allocation
 * - Gzip compression for large payloads
 * - CORS headers for Facebook access
 * - Returns 404 if no CSV available
 * - Returns 500 if Blob fetch fails
 *
 * This endpoint is public and does not require authentication.
 * Facebook will poll this URL periodically to sync the product catalog.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { getCSV } from '@/lib/storage/blob';
import { logInfo, logError } from '@/lib/utils/logger';
import { StorageError, toPublicError } from '@/lib/utils/errors';

const gzipAsync = promisify(gzip);

/**
 * Minimum content size (in bytes) to enable gzip compression
 * Only compress if content is larger than 1KB to avoid overhead
 */
const GZIP_THRESHOLD = 1024;

/**
 * Common CORS headers for cross-origin access
 *
 * Using '*' for Access-Control-Allow-Origin is intentional for this endpoint:
 * - Facebook's catalog fetch service may request from various domains
 * - The endpoint only serves public product catalog data (no sensitive information)
 * - The endpoint is read-only (GET only) with no authentication required
 *
 * Security note: If stricter CORS is needed in the future, Facebook's known
 * domains can be added here, but this would require ongoing maintenance as
 * Facebook's infrastructure changes.
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
 * Supports conditional requests via ETag/If-None-Match for efficient caching
 */
export async function GET(request: NextRequest): Promise<Response> {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const isFacebookBot = userAgent.includes('facebookexternalhit');
  
  logInfo('Feed access requested', {
    userAgent,
    referer: request.headers.get('referer'),
    ip: request.headers.get('x-forwarded-for'),
    isFacebookBot,
  });

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

    // Generate ETag from content hash for conditional requests
    const etag = `"${createHash('sha256').update(result.content).digest('hex')}"`;
    const lastModified = result.uploadedAt.toUTCString();

    // Check If-None-Match header for conditional request
    const requestEtag = request.headers.get('if-none-match');
    if (requestEtag === etag) {
      logInfo('Feed not modified - returning 304', { etag });
      return new Response(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Last-Modified': lastModified,
          'Cache-Control': 'public, max-age=3600',
          ...corsHeaders,
        },
      });
    }

    // Check Accept-Encoding for gzip support
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    const supportsGzip = acceptEncoding.includes('gzip');
    const shouldCompress = supportsGzip && result.content.length > GZIP_THRESHOLD;

    // Prepare response body and headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'ETag': etag,
      'Last-Modified': lastModified,
      ...corsHeaders,
    };

    let responseBody: BodyInit;
    if (shouldCompress) {
      const compressed = await gzipAsync(Buffer.from(result.content));
      responseBody = new Uint8Array(compressed);
      responseHeaders['Content-Encoding'] = 'gzip';
      responseHeaders['Content-Length'] = compressed.length.toString();
    } else {
      responseBody = result.content;
      responseHeaders['Content-Length'] = Buffer.byteLength(result.content, 'utf-8').toString();
    }

    logInfo('Feed served successfully', {
      size: result.content.length,
      compressedSize: shouldCompress ? responseHeaders['Content-Length'] : undefined,
      uploadedAt: result.uploadedAt.toISOString(),
      etag,
      isFacebookBot,
      compressed: shouldCompress,
    });

    // Return CSV with appropriate headers
    return new Response(responseBody, {
      status: 200,
      headers: responseHeaders,
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
