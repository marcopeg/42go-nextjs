'use client';

import { UserDashboard } from '@/components/auth/user-dashboard';
import { InternalPage } from '@/components/layout/internal-page';
import { PageTransition } from '@/components/page-transition';

export default function DashboardPage() {
  return (
    <PageTransition>
      <InternalPage title="Dashboard" subtitle="Welcome to the dashboard">
        <UserDashboard />
      </InternalPage>
    </PageTransition>
  );
}
