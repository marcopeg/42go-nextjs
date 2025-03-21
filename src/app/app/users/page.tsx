'use client';

import { InternalPage } from '@/components/layout-app/internal-page';
import { UsersList } from '@/components/users/users-list';
import { ApiErrorBoundary } from '@/components/api-error-boundary';

export default function UsersPage() {
  return (
    <InternalPage title="Users" subtitle="Manage your application users">
      <ApiErrorBoundary
        fallbackTitle="Access Denied"
        fallbackMessage="You don't have permission to view users. Please contact an administrator if you believe this is an error."
      >
        <UsersList />
      </ApiErrorBoundary>
    </InternalPage>
  );
}
