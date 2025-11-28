/**
 * Dashboard Page
 * Shows OAuth status, last sync info, and manual sync controls
 *
 * Route: /dashboard
 */

import { Suspense } from 'react';
import DashboardClient from './components/DashboardClient';

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
    <DashboardClient
      authStatus={authStatus}
      errorCode={errorCode}
      errorMessage={errorMessage}
    />
  );
}

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        <div className="text-zinc-500">Loading dashboard...</div>
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
    <Suspense fallback={<LoadingFallback />}>
      <DashboardContent searchParams={props.searchParams} />
    </Suspense>
  );
}
