/**
 * OAuth 2.0 PKCE helper functions for Etsy authentication
 * Implements RFC 7636 (Proof Key for Code Exchange)
 */

/**
 * Characters allowed in the code verifier (RFC 7636 Section 4.1)
 * Unreserved characters: A-Z, a-z, 0-9, "-", ".", "_", "~"
 */
const CODE_VERIFIER_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/**
 * Generates a cryptographically random code verifier for PKCE
 * The code verifier is a high-entropy cryptographic random string
 * between 43 and 128 characters long (RFC 7636 Section 4.1)
 *
 * @param length - Length of the code verifier (default: 128)
 * @returns Random code verifier string
 * @throws Error if length is not between 43 and 128
 * @example
 * const verifier = generateCodeVerifier();
 * // Returns a 128-character random string
 */
export function generateCodeVerifier(length: number = 128): string {
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128 characters');
  }

  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  let verifier = '';
  for (let i = 0; i < length; i++) {
    verifier += CODE_VERIFIER_CHARS[randomBytes[i] % CODE_VERIFIER_CHARS.length];
  }

  return verifier;
}

/**
 * Generates a code challenge from a code verifier using SHA-256
 * The code challenge is the Base64-URL-encoded SHA256 hash of the code verifier
 * (RFC 7636 Section 4.2)
 *
 * @param verifier - The code verifier string
 * @returns Base64-URL encoded SHA-256 hash of the verifier
 * @example
 * const verifier = generateCodeVerifier();
 * const challenge = await generateCodeChallenge(verifier);
 * // Used in authorization request as code_challenge parameter
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  // Encode the verifier as UTF-8 bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);

  // Hash with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to Base64-URL encoding (RFC 4648 Section 5)
  const hashArray = new Uint8Array(hashBuffer);
  const base64 = btoa(String.fromCharCode(...hashArray));

  // Convert Base64 to Base64-URL: replace + with -, / with _, remove =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates a cryptographically random state parameter for OAuth
 * Used to prevent CSRF attacks during the authorization flow
 *
 * @param length - Length of the state string (default: 32)
 * @returns Random state string (hex-encoded)
 * @example
 * const state = generateState();
 * // Returns a 64-character hex string (32 bytes)
 */
export function generateState(length: number = 32): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  // Convert to hex string
  return Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * OAuth state data stored in Edge Config
 * @property code_verifier - PKCE code verifier
 * @property created_at - ISO 8601 timestamp when the state was created
 */
export interface OAuthStateData {
  code_verifier: string;
  created_at: string;
}

/**
 * Etsy OAuth configuration
 */
export interface EtsyOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string;
}

/**
 * Builds the Etsy OAuth authorization URL with all required parameters
 *
 * @param config - OAuth configuration
 * @param state - State parameter for CSRF protection
 * @param codeChallenge - PKCE code challenge
 * @returns Complete authorization URL
 * @example
 * const url = buildAuthorizationUrl(config, state, challenge);
 * // Returns: https://www.etsy.com/oauth/connect?response_type=code&...
 */
export function buildAuthorizationUrl(
  config: EtsyOAuthConfig,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    client_id: config.clientId,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://www.etsy.com/oauth/connect?${params.toString()}`;
}
