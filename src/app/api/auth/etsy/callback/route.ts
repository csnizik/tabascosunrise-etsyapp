/**
 * OAuth Callback Route
 * Handles the callback from Etsy after user authorization
 *
 * GET /api/auth/etsy/callback
 * - Validates state parameter to prevent CSRF attacks
 * - Retrieves code_verifier from Edge Config
 * - Exchanges authorization code for access and refresh tokens
 * - Stores tokens in Edge Config
 * - Cleans up temporary OAuth state
 * - Redirects to dashboard with success/error message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOAuthState, deleteOAuthState, storeEtsyTokens } from '@/lib/storage/edge-config';
import { logInfo, logError } from '@/lib/utils/logger';
import { OAuthError, ConfigError, toPublicError } from '@/lib/utils/errors';
import type { EtsyTokens } from '@/lib/etsy/types';

/**
 * Maximum age for OAuth state (10 minutes)
 * States older than this are considered expired
 */
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Token response from Etsy OAuth endpoint
 */
interface EtsyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

/**
 * GET handler for OAuth callback
 * Exchanges authorization code for tokens and stores them
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Get base URL for redirects
  const baseUrl = new URL(request.url).origin;
  const dashboardUrl = `${baseUrl}/dashboard`;

  try {
    // Check for OAuth error response from Etsy
    if (error) {
      logError('OAuth error from Etsy', { error, errorDescription });
      throw new OAuthError(
        errorDescription || `OAuth error: ${error}`,
        'ETSY_OAUTH_ERROR'
      );
    }

    // Validate required parameters
    if (!code) {
      throw new OAuthError('Missing authorization code', 'MISSING_CODE');
    }

    if (!state) {
      throw new OAuthError('Missing state parameter', 'MISSING_STATE');
    }

    logInfo('OAuth callback received', { hasCode: !!code, hasState: !!state });

    // Retrieve stored OAuth state data
    const storedState = await getOAuthState(state);

    if (!storedState) {
      throw new OAuthError(
        'Invalid or expired state parameter. Please restart the authorization flow.',
        'STATE_MISMATCH'
      );
    }

    // Check if state has expired
    const stateAge = Date.now() - new Date(storedState.created_at).getTime();
    if (stateAge > OAUTH_STATE_MAX_AGE_MS) {
      // Clean up expired state
      await deleteOAuthState(state);
      throw new OAuthError(
        'Authorization session has expired. Please restart the authorization flow.',
        'STATE_EXPIRED'
      );
    }

    logInfo('State validated successfully', { stateAge: `${Math.round(stateAge / 1000)}s` });

    // Validate required environment variables
    const clientId = process.env.ETSY_API_KEY;
    const redirectUri = process.env.ETSY_REDIRECT_URI;

    if (!clientId) {
      throw new ConfigError('ETSY_API_KEY environment variable is required');
    }

    if (!redirectUri) {
      throw new ConfigError('ETSY_REDIRECT_URI environment variable is required');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForTokens(
      code,
      storedState.code_verifier,
      clientId,
      redirectUri
    );

    // Extract user_id from access_token (format: "user_id.token")
    const userId = extractUserId(tokenResponse.access_token);

    // Calculate token expiry time
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    // Prepare tokens for storage
    const tokens: EtsyTokens = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: expiresAt,
      user_id: userId,
    };

    // Store tokens in Edge Config
    await storeEtsyTokens(tokens);

    logInfo('Tokens stored successfully', {
      userId,
      expiresAt,
      hasRefreshToken: !!tokenResponse.refresh_token,
    });

    // Clean up OAuth state
    await deleteOAuthState(state);

    logInfo('OAuth flow completed successfully');

    // Redirect to dashboard with success message
    const successUrl = new URL(dashboardUrl);
    successUrl.searchParams.set('auth', 'success');
    return NextResponse.redirect(successUrl.toString());
  } catch (err) {
    logError('OAuth callback failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
      code: err instanceof OAuthError ? err.code : undefined,
    });

    // Clean up OAuth state if it exists (fire-and-forget to avoid masking original error)
    if (state) {
      deleteOAuthState(state).catch((cleanupErr) => {
        logError('Failed to clean up OAuth state during error handling', {
          error: cleanupErr instanceof Error ? cleanupErr.message : 'Unknown error',
        });
      });
    }

    // Redirect to dashboard with error message
    const publicError = toPublicError(err);
    const errorUrl = new URL(dashboardUrl);
    errorUrl.searchParams.set('auth', 'error');
    errorUrl.searchParams.set('error', publicError.code || 'UNKNOWN_ERROR');
    errorUrl.searchParams.set('message', publicError.message);
    return NextResponse.redirect(errorUrl.toString());
  }
}

/**
 * Exchange authorization code for access and refresh tokens
 *
 * @param code - Authorization code from Etsy
 * @param codeVerifier - PKCE code verifier
 * @param clientId - Etsy API key
 * @param redirectUri - OAuth redirect URI
 * @returns Token response from Etsy
 */
async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string
): Promise<EtsyTokenResponse> {
  const tokenUrl = 'https://api.etsy.com/v3/public/oauth/token';

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  logInfo('Exchanging authorization code for tokens');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to exchange authorization code';
    let errorCode = 'TOKEN_EXCHANGE_ERROR';

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error_description) {
        errorMessage = errorJson.error_description;
      }
      if (errorJson.error === 'invalid_grant') {
        errorCode = 'CODE_EXPIRED';
        errorMessage = 'Authorization code has expired. Please restart the authorization flow.';
      }
    } catch {
      // Use default error message if parsing fails
    }

    logError('Token exchange failed', {
      status: response.status,
      error: errorText,
    });

    throw new OAuthError(errorMessage, errorCode);
  }

  const tokenData: EtsyTokenResponse = await response.json();

  // Validate response structure
  if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.expires_in) {
    throw new OAuthError(
      'Invalid response from Etsy: missing required token fields',
      'INVALID_TOKEN_RESPONSE'
    );
  }

  logInfo('Token exchange successful', {
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
  });

  return tokenData;
}

/**
 * Extract user ID from Etsy access token
 * Etsy access tokens have format: "user_id.actual_token"
 *
 * @param accessToken - The access token from Etsy
 * @returns User ID extracted from the token
 * @throws OAuthError if token format is unexpected
 */
function extractUserId(accessToken: string): string {
  const parts = accessToken.split('.');
  if (parts.length < 2) {
    logError('Unexpected access token format', { tokenLength: accessToken.length });
    throw new OAuthError(
      'Invalid access token format received from Etsy',
      'INVALID_TOKEN_FORMAT'
    );
  }
  return parts[0];
}
