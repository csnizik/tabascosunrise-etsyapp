/**
 * Dashboard Page
 * Shows OAuth status, last sync info, and manual sync controls
 *
 * Route: /dashboard
 */

import { Suspense } from 'react';

/**
 * Props for the DashboardContent component
 */
interface DashboardContentProps {
  searchParams: Promise<{
    auth?: string;
    error?: string;
    message?: string;
  }>;
}

/**
 * Dashboard content that handles async search params
 */
async function DashboardContent({ searchParams }: DashboardContentProps) {
  const params = await searchParams;
  const authStatus = params.auth;
  const errorCode = params.error;
  const errorMessage = params.message;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">
          TabascoSunrise Dashboard
        </h1>

        {/* Auth Status Messages */}
        {authStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

        {/* Dashboard Content */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Auth Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Etsy Connection
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Status</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Check Connection
                </span>
              </div>
              <a
                href="/api/auth/etsy/authorize"
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
              >
                Connect to Etsy
              </a>
            </div>
          </div>

          {/* Sync Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Catalog Sync
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Last Sync</span>
                <span className="text-zinc-500 dark:text-zinc-500 text-sm">
                  Never
                </span>
              </div>
              <button
                disabled
                className="w-full px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-medium rounded-lg cursor-not-allowed"
              >
                Sync Now (Connect First)
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Getting Started
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
            <li>Click &quot;Connect to Etsy&quot; to authorize this app</li>
            <li>Grant permission to read your shop listings</li>
            <li>You&apos;ll be redirected back here after authorization</li>
            <li>Use &quot;Sync Now&quot; to generate your Facebook catalog</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard page with loading state
 */
export default async function DashboardPage(props: {
  searchParams: Promise<{
    auth?: string;
    error?: string;
    message?: string;
  }>;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-black p-8 flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    }>
      <DashboardContent searchParams={props.searchParams} />
    </Suspense>
  );
}
