'use client';

import { UserDashboard } from '@/components/auth/user-dashboard';
import { InternalPage } from '@/components/layout/internal-page';

export default function DashboardPage() {
  return (
    <InternalPage title="Dashboard">
      <UserDashboard />
    </InternalPage>
  );
}
