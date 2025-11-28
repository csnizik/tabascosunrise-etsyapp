/**
 * Feed Validation API Route
 * Validates the structure of the current feed
 *
 * GET /api/feed/validate
 * - Checks if feed exists and has correct headers
 * - Returns validation status and metadata
 */

import { NextResponse } from 'next/server';
import { getCSV } from '@/lib/storage/blob';
import { logInfo, logError } from '@/lib/utils/logger';
import { StorageError, toPublicError } from '@/lib/utils/errors';

/**
 * Expected CSV headers for Facebook catalog feed
 */
const EXPECTED_HEADERS = 'id,title,description,availability,condition,price,link,image_link,brand';

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
 * GET handler for feed validation
 * Validates the structure and format of the current feed
 */
export async function GET(): Promise<Response> {
  logInfo('Feed validation requested');

  try {
    const result = await getCSV();

    if (!result) {
      return NextResponse.json(
        {
          success: true,
          data: {
            valid: false,
            error: 'No feed found',
          },
        },
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // Parse and validate headers
    const lines = result.content.split('\n').filter((line) => line.trim().length > 0);
    const headerLine = lines[0] || '';
    const headersValid = headerLine === EXPECTED_HEADERS;
    const lineCount = Math.max(0, lines.length - 1); // Exclude header row

    logInfo('Feed validation completed', {
      valid: headersValid,
      lineCount,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          valid: headersValid,
          lineCount,
          sizeBytes: result.content.length,
          uploadedAt: result.uploadedAt.toISOString(),
          headers: headerLine,
          expectedHeaders: EXPECTED_HEADERS,
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    logError('Feed validation failed', {
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
