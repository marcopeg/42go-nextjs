'use client';

import { UserDashboard } from '@/components/auth/user-dashboard';
import { InternalPage } from '@/components/layout-app/internal-page';

export default function DashboardPage() {
  return (
    <InternalPage title="Dashboard" subtitle="Welcome to the dashboard">
      <UserDashboard />
    </InternalPage>
  );
}
