'use client';

/**
 * Dashboard Client Component
 * Handles interactive elements: status fetching, manual sync trigger, and copy functionality
 */

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { StatusResponse } from '@/app/api/status/route';

/**
 * Props for toast/feedback messages
 */
interface FeedbackMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

/**
 * Props passed from search params
 */
interface DashboardClientProps {
  authStatus?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
    </div>
  );
}

/**
 * Auth status badge component
 */
function AuthStatusBadge({
  authenticated,
  tokenExpired,
}: {
  authenticated: boolean;
  tokenExpired?: boolean;
}) {
  if (!authenticated) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
        Not Connected
      </span>
    );
  }

  if (tokenExpired) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
        Token Expired
      </span>
    );
  }

  return (
    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
      Connected
    </span>
  );
}

/**
 * Copy button with feedback
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
      title="Copy feed URL"
    >
      {copied ? (
        <>
          <svg
            className="w-4 h-4"
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
          Copied!
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

/**
 * Sync status badge
 */
function SyncStatusBadge({ status }: { status: 'success' | 'failure' }) {
  if (status === 'success') {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
        Success
      </span>
    );
  }

  return (
    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
      Failed
    </span>
  );
}

/**
 * Dashboard client component
 */
export default function DashboardClient({
  authStatus,
  errorCode,
  errorMessage,
}: DashboardClientProps) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  // Fetch status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/status');
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to fetch status');
        }

        setStatus(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  // Handle manual sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      setFeedback(null);

      const response = await fetch('/api/sync/manual', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Sync failed');
      }

      // Refresh status after successful sync
      const statusResponse = await fetch('/api/status');
      const statusData = await statusResponse.json();
      if (statusData.success) {
        setStatus(statusData.data);
      }

      const listingsCount = data.stats?.listingsCount ?? 0;
      setFeedback({
        type: 'success',
        text: `Successfully synced ${listingsCount} listings!`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">
          TabascoSunrise Dashboard
        </h1>

        {/* Auth Status Messages from URL params */}
        {authStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
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
              <p className="text-green-800 dark:text-green-200 font-medium">
                Successfully connected to Etsy!
              </p>
            </div>
          </div>
        )}

        {authStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <p className="text-red-800 dark:text-red-200 font-medium">
                Authentication failed
              </p>
            </div>
            {errorMessage && (
              <p className="text-red-700 dark:text-red-300 text-sm ml-7">
                {errorMessage}
              </p>
            )}
            {errorCode && (
              <p className="text-red-600 dark:text-red-400 text-xs ml-7 mt-1 font-mono">
                Error code: {errorCode}
              </p>
            )}
          </div>
        )}

        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              feedback.type === 'success'
                ? 'bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700'
                : feedback.type === 'error'
                  ? 'bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700'
                  : 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700'
            }`}
          >
            <p
              className={`font-medium ${
                feedback.type === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : feedback.type === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-blue-800 dark:text-blue-200'
              }`}
            >
              {feedback.text}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSpinner />}

        {/* Error State */}
        {!loading && error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200 font-medium">
              Error loading status: {error}
            </p>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && status && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Auth Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  Etsy Connection
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Status
                    </span>
                    <AuthStatusBadge
                      authenticated={status.authenticated}
                      tokenExpired={status.tokenExpired}
                    />
                  </div>
                  {status.shopId && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Shop ID
                      </span>
                      <span className="text-zinc-900 dark:text-white font-mono text-sm">
                        {status.shopId}
                      </span>
                    </div>
                  )}
                  {!status.authenticated || status.tokenExpired ? (
                    <a
                      href="/api/auth/etsy/authorize"
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                    >
                      {status.tokenExpired
                        ? 'Reconnect to Etsy'
                        : 'Connect to Etsy'}
                    </a>
                  ) : (
                    <div className="text-sm text-zinc-500 dark:text-zinc-500">
                      ✓ Ready to sync
                    </div>
                  )}
                </div>
              </div>

              {/* Sync Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  Catalog Sync
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Last Sync
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-500 text-sm">
                      {status.sync
                        ? formatRelativeTime(status.sync.lastSyncTime)
                        : 'Never'}
                    </span>
                  </div>
                  {status.sync && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Status
                        </span>
                        <SyncStatusBadge status={status.sync.status} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Listings
                        </span>
                        <span className="text-zinc-900 dark:text-white font-medium">
                          {status.sync.listingsCount}
                        </span>
                      </div>
                    </>
                  )}
                  <button
                    onClick={handleSync}
                    disabled={!status.authenticated || status.tokenExpired || syncing}
                    className={`w-full px-4 py-2 font-medium rounded-lg transition-colors ${
                      status.authenticated && !status.tokenExpired && !syncing
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {syncing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Syncing...
                      </span>
                    ) : !status.authenticated ? (
                      'Connect First'
                    ) : status.tokenExpired ? (
                      'Reconnect Required'
                    ) : (
                      'Sync Now'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Feed URL Card */}
            {status.sync?.feedUrl && (
              <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  Facebook Catalog Feed
                </h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 font-mono text-sm text-zinc-700 dark:text-zinc-300 break-all">
                      {status.sync.feedUrl}
                    </div>
                  </div>
                  <CopyButton text={status.sync.feedUrl} />
                </div>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
                  Add this URL to your Facebook Business Manager to import your
                  catalog.
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                Getting Started
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>
                  {status.authenticated ? (
                    <span className="line-through text-zinc-400 dark:text-zinc-600">
                      Click &quot;Connect to Etsy&quot; to authorize this app
                    </span>
                  ) : (
                    'Click "Connect to Etsy" to authorize this app'
                  )}
                </li>
                <li>
                  {status.authenticated ? (
                    <span className="line-through text-zinc-400 dark:text-zinc-600">
                      Grant permission to read your shop listings
                    </span>
                  ) : (
                    'Grant permission to read your shop listings'
                  )}
                </li>
                <li>
                  {status.authenticated ? (
                    <span className="line-through text-zinc-400 dark:text-zinc-600">
                      You&apos;ll be redirected back here after authorization
                    </span>
                  ) : (
                    "You'll be redirected back here after authorization"
                  )}
                </li>
                <li>
                  {status.sync?.feedUrl ? (
                    <span className="line-through text-zinc-400 dark:text-zinc-600">
                      Use &quot;Sync Now&quot; to generate your Facebook catalog
                    </span>
                  ) : (
                    'Use "Sync Now" to generate your Facebook catalog'
                  )}
                </li>
                <li>
                  Copy the Feed URL and add it to Facebook Business Manager
                </li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
