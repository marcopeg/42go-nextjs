'use client';

import { UserDashboard } from '@/components/auth/user-dashboard';
import { InternalPage } from '@/components/layout-app/internal-page';
import { ApiErrorBoundary } from '@/components/api-error-boundary';

export default function DashboardPage() {
  return (
    <InternalPage title="Dashboard" subtitle="Welcome to the dashboard">
      <ApiErrorBoundary
        fallbackTitle="Access Denied"
        fallbackMessage="You don't have permission to access this dashboard. Please contact an administrator if you believe this is an error."
      >
        <UserDashboard />
      </ApiErrorBoundary>
    </InternalPage>
  );
}
