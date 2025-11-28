/**
 * Landing Page
 * Shows authentication status and provides entry point to the app
 *
 * Route: /
 */

import { getEtsyTokens, isTokenExpired } from '@/lib/storage/edge-config';
import { StorageError } from '@/lib/utils/errors';
import Link from 'next/link';

/**
 * Auth status information
 */
interface AuthStatus {
  authenticated: boolean;
  tokenExpired?: boolean;
}

/**
 * Get authentication status from Edge Config
 * Handles the case where Edge Config is not configured
 */
async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const tokens = await getEtsyTokens();
    if (tokens) {
      return {
        authenticated: true,
        tokenExpired: isTokenExpired(tokens),
      };
    }
    return { authenticated: false };
  } catch (error) {
    // If Edge Config is not configured, treat as not authenticated
    if (
      error instanceof StorageError &&
      (error.code === 'EDGE_CONFIG_NOT_CONFIGURED' ||
        error.message.includes('not configured'))
    ) {
      return { authenticated: false };
    }
    // For other errors, also treat as not authenticated to avoid blocking the page
    return { authenticated: false };
  }
}

export default async function Home() {
  const authStatus = await getAuthStatus();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-8">
      <main className="max-w-xl w-full text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <span className="text-5xl">🌶️</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
          TabascoSunrise Etsy Facebook Sync
        </h1>

        {/* Description */}
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
          Automatically sync your Etsy listings to Facebook Catalog. Keep your
          products updated across platforms with zero manual effort.
        </p>

        {/* Auth-based CTA */}
        {authStatus.authenticated && !authStatus.tokenExpired ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-4">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">Connected to Etsy</span>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {authStatus.tokenExpired && (
              <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400 mb-4">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="font-medium">Session expired - please reconnect</span>
              </div>
            )}
            <a
              href="/api/auth/etsy/authorize"
              className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              {authStatus.tokenExpired ? 'Reconnect to Etsy' : 'Authorize with Etsy'}
            </a>
          </div>
        )}

        {/* Features */}
        <div className="mt-12 grid gap-4 text-left max-w-md mx-auto">
          <div className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-xl">🔄</span>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Automatic Sync
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Your catalog updates daily via scheduled sync
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Facebook Ready
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                CSV feed formatted for Facebook Business Manager
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-xl">🔒</span>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Secure OAuth
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Safe authorization with Etsy&apos;s official API
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
