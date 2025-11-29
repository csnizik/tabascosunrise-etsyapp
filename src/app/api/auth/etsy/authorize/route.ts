/**
 * OAuth Authorization Route
 * Initiates the Etsy OAuth 2.0 PKCE flow
 *
 * GET /api/auth/etsy/authorize
 * - Generates PKCE values (code_verifier, code_challenge)
 * - Generates state parameter for CSRF protection
 * - Stores code_verifier and state in Edge Config with creation timestamp
 *   (expiry is checked in the callback handler based on created_at)
 * - Redirects user to Etsy consent page
 */

import { NextResponse } from 'next/server';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  type OAuthStateData,
} from '@/lib/etsy/oauth';
import { storeOAuthState } from '@/lib/storage/edge-config';
import { logInfo, logError } from '@/lib/utils/logger';
import { ConfigError, OAuthError, StorageError, toPublicError } from '@/lib/utils/errors';

/**
 * GET handler for initiating OAuth flow
 * Generates PKCE values, stores state, and redirects to Etsy
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Validate required environment variables
    const clientId = process.env.ETSY_API_KEY;
    const redirectUri = process.env.ETSY_REDIRECT_URI;
    const scopes = process.env.ETSY_SCOPES || 'listings_r shops_r';

    if (!clientId) {
      throw new ConfigError('ETSY_API_KEY environment variable is required');
    }

    if (!redirectUri) {
      throw new ConfigError('ETSY_REDIRECT_URI environment variable is required');
    }

    logInfo('Starting OAuth authorization flow');

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    logInfo('PKCE values generated', {
      codeVerifierLength: codeVerifier.length,
      codeChallengeLength: codeChallenge.length,
      stateLength: state.length,
    });

    // Store code_verifier and state in Edge Config with timestamp
    const stateData: OAuthStateData = {
      code_verifier: codeVerifier,
      created_at: new Date().toISOString(),
    };

    await storeOAuthState(state, stateData);

    await new Promise(resolve => setTimeout(resolve, 1000)); // slight delay to ensure storage completes
    logInfo('Waited for Edge Config propagation');

    
    // Build authorization URL
    const authUrl = buildAuthorizationUrl(
      { clientId, redirectUri, scopes },
      state,
      codeChallenge
    );

    // Log with redacted client_id using URLSearchParams for safe parsing
    const redactedUrl = new URL(authUrl);
    redactedUrl.searchParams.set('client_id', '***');
    logInfo('Redirecting to Etsy authorization page', {
      authUrl: redactedUrl.toString()
    });

    // Redirect user to Etsy consent page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logError('OAuth authorization failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof OAuthError ? error.code : undefined,
    });

    // Return error response
    const publicError = toPublicError(error);
    const statusCode = error instanceof ConfigError ? 500 :
                       error instanceof StorageError ? 503 : 500;

    return NextResponse.json(
      {
        success: false,
        error: publicError,
      },
      { status: statusCode }
    );
  }
}
