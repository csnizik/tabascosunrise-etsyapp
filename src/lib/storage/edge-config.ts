/**
 * Edge Config storage operations
 * Centralizes all Edge Config read/write operations for the application
 *
 * Uses @vercel/edge-config SDK with the EDGE_CONFIG environment variable
 * (automatically set by Vercel when Edge Config is connected to the project)
 */

import { createClient } from '@vercel/edge-config';
import { StorageError } from '@/lib/utils/errors';
import { logInfo, logError } from '@/lib/utils/logger';
import type { OAuthStateData } from '@/lib/etsy/oauth';
import type { EtsyTokens } from '@/lib/etsy/types';

/**
 * Get the Edge Config client
 * Uses the EDGE_CONFIG environment variable which is automatically set by Vercel
 */
function getEdgeConfigClient() {
  const connectionString = process.env.EDGE_CONFIG;

  if (!connectionString) {
    throw new StorageError(
      'Edge Config is not configured. Ensure EDGE_CONFIG environment variable is set.',
      'EDGE_CONFIG_NOT_CONFIGURED'
    );
  }

  return createClient(connectionString);
}

/**
 * Store OAuth state data for the authorization flow
 * Used to verify the callback and retrieve the code verifier
 *
 * @param state - The state parameter used as the key
 * @param data - OAuth state data including code_verifier and created_at
 * @throws StorageError if the operation fails
 */
export async function storeOAuthState(state: string, data: OAuthStateData): Promise<void> {
  const key = `oauth_state_${state}`;

  try {
    // Note: @vercel/edge-config client is read-only
    // For write operations, we use the Vercel API directly
    await writeToEdgeConfig(key, data);
    logInfo('OAuth state stored in Edge Config', { key });
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    logError('Failed to store OAuth state', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new StorageError(
      'Failed to store OAuth state in Edge Config',
      'EDGE_CONFIG_WRITE_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Retrieve OAuth state data for the authorization callback
 *
 * @param state - The state parameter to look up
 * @returns OAuth state data or null if not found
 */
export async function getOAuthState(state: string): Promise<OAuthStateData | null> {
  const key = `oauth_state_${state}`;

  try {
    const client = getEdgeConfigClient();
    const data = await client.get<OAuthStateData>(key);
    return data ?? null;
  } catch (error) {
    logError('Failed to retrieve OAuth state', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new StorageError(
      'Failed to retrieve OAuth state from Edge Config',
      'EDGE_CONFIG_READ_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete OAuth state after successful authorization
 *
 * @param state - The state parameter to delete
 */
export async function deleteOAuthState(state: string): Promise<void> {
  const key = `oauth_state_${state}`;

  try {
    await deleteFromEdgeConfig(key);
    logInfo('OAuth state deleted from Edge Config', { key });
  } catch (error) {
    // Log but don't throw - cleanup failure shouldn't break the flow
    logError('Failed to delete OAuth state', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Store Etsy tokens after successful OAuth
 *
 * @param tokens - Etsy token data
 */
export async function storeEtsyTokens(tokens: EtsyTokens): Promise<void> {
  try {
    await writeToEdgeConfig('etsy_tokens', tokens);
    logInfo('Etsy tokens stored in Edge Config');
  } catch (error) {
    logError('Failed to store Etsy tokens', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new StorageError(
      'Failed to store Etsy tokens in Edge Config',
      'EDGE_CONFIG_WRITE_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Retrieve stored Etsy tokens
 *
 * @returns Etsy tokens or null if not found
 */
export async function getEtsyTokens(): Promise<EtsyTokens | null> {
  try {
    const client = getEdgeConfigClient();
    const data = await client.get<EtsyTokens>('etsy_tokens');
    return data ?? null;
  } catch (error) {
    logError('Failed to retrieve Etsy tokens', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new StorageError(
      'Failed to retrieve Etsy tokens from Edge Config',
      'EDGE_CONFIG_READ_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Buffer time (in milliseconds) before token expiry to trigger refresh
 * Refreshing 5 minutes early avoids race conditions
 */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Check if the stored access token is expired or will expire soon
 * Checks expiry 5 minutes early to avoid race conditions
 *
 * @param tokens - Etsy token data
 * @returns true if the token is expired or will expire within 5 minutes
 * @example
 * const tokens = await getEtsyTokens();
 * if (tokens && isTokenExpired(tokens)) {
 *   // Refresh the token
 * }
 */
export function isTokenExpired(tokens: EtsyTokens): boolean {
  const expiresAt = new Date(tokens.expires_at).getTime();
  const now = Date.now();
  return now >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

/**
 * Response from Etsy OAuth token refresh endpoint
 */
interface EtsyRefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

/**
 * Refresh the Etsy access token using the refresh token
 * Sends a POST request to the Etsy OAuth token endpoint
 * and updates the stored tokens in Edge Config
 *
 * @param currentTokens - Current Etsy tokens including refresh_token
 * @returns Updated Etsy tokens with new access_token and expires_at
 * @throws StorageError if refresh fails or tokens cannot be stored
 * @example
 * const tokens = await getEtsyTokens();
 * if (tokens && isTokenExpired(tokens)) {
 *   const newTokens = await refreshAccessToken(tokens);
 * }
 */
export async function refreshAccessToken(currentTokens: EtsyTokens): Promise<EtsyTokens> {
  const apiKey = process.env.ETSY_API_KEY;

  if (!apiKey) {
    throw new StorageError(
      'ETSY_API_KEY environment variable is not set',
      'CONFIG_ERROR'
    );
  }

  logInfo('Refreshing Etsy access token');

  try {
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: apiKey,
        refresh_token: currentTokens.refresh_token,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('Failed to refresh Etsy access token', {
        status: response.status,
        error: errorText,
      });

      // Check if this is a refresh token expiration (90 days)
      if (response.status === 400 || response.status === 401) {
        throw new StorageError(
          'Refresh token has expired or is invalid. Re-authorization required.',
          'REFRESH_TOKEN_EXPIRED'
        );
      }

      throw new StorageError(
        `Failed to refresh Etsy access token: ${errorText}`,
        'TOKEN_REFRESH_ERROR'
      );
    }

    const data: EtsyRefreshTokenResponse = await response.json();

    // Calculate new expiration time
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // Create updated tokens object
    const updatedTokens: EtsyTokens = {
      ...currentTokens,
      access_token: data.access_token,
      refresh_token: data.refresh_token, // Etsy returns same refresh token
      expires_at: expiresAt,
    };

    // Store updated tokens in Edge Config
    await storeEtsyTokens(updatedTokens);

    logInfo('Successfully refreshed Etsy access token', {
      expires_at: expiresAt,
    });

    return updatedTokens;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    logError('Unexpected error during token refresh', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new StorageError(
      'Failed to refresh Etsy access token',
      'TOKEN_REFRESH_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Internal helper to write data to Edge Config
 * Uses the Vercel API since the SDK is read-only
 */
async function writeToEdgeConfig(key: string, value: unknown): Promise<void> {
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const edgeConfigToken = process.env.EDGE_CONFIG_TOKEN;

  if (!edgeConfigId || !edgeConfigToken) {
    throw new StorageError(
      'Edge Config write credentials not configured. Set EDGE_CONFIG_ID and EDGE_CONFIG_TOKEN.',
      'EDGE_CONFIG_WRITE_NOT_CONFIGURED'
    );
  }

  const response = await fetch(
    `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${edgeConfigToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'upsert',
            key,
            value,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new StorageError(
      `Edge Config write failed: ${errorText}`,
      'EDGE_CONFIG_WRITE_ERROR'
    );
  }
}

/**
 * Internal helper to delete data from Edge Config
 * Uses the Vercel API since the SDK is read-only
 */
async function deleteFromEdgeConfig(key: string): Promise<void> {
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const edgeConfigToken = process.env.EDGE_CONFIG_TOKEN;

  if (!edgeConfigId || !edgeConfigToken) {
    throw new StorageError(
      'Edge Config write credentials not configured. Set EDGE_CONFIG_ID and EDGE_CONFIG_TOKEN.',
      'EDGE_CONFIG_WRITE_NOT_CONFIGURED'
    );
  }

  const response = await fetch(
    `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${edgeConfigToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'delete',
            key,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new StorageError(
      `Edge Config delete failed: ${errorText}`,
      'EDGE_CONFIG_DELETE_ERROR'
    );
  }
}
