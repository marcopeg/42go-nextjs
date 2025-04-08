'use client';

import { InternalPage } from '@/components/layout-app/internal-page';
import { UsersList } from '@/components/users/users-list';

export default function UsersPage() {
  return (
    <InternalPage
      title="Users"
      subtitle="Manage all users in your organization"
      fallbackMessage="You don't have permission to access the user management section."
    >
      <UsersList />
    </InternalPage>
  );
}
