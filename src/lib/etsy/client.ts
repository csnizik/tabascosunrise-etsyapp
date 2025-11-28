/**
 * Etsy API client with automatic token validation and refresh
 * Handles authentication and provides methods for Etsy API calls
 */

import { TokenError, StorageError } from '@/lib/utils/errors';
import { logInfo, logError } from '@/lib/utils/logger';
import {
  getEtsyTokens,
  isTokenExpired,
  refreshAccessToken,
} from '@/lib/storage/edge-config';
import type { EtsyTokens } from '@/lib/etsy/types';

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
