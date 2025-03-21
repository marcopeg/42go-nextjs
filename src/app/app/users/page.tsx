'use client';

import { InternalPage } from '@/components/layout-app/internal-page';
import { UsersList } from '@/components/users/users-list';
import { ApiErrorBoundary } from '@/components/api-error-boundary';

export default function UsersPage() {
  return (
    <ApiErrorBoundary
      fallbackTitle="Access Denied"
      fallbackMessage="You don't have permission to access the user management section."
      fullPage={true}
    >
      <InternalPage title="Users" subtitle="Manage all users in your organization">
        <UsersList />
      </InternalPage>
    </ApiErrorBoundary>
  );
}
