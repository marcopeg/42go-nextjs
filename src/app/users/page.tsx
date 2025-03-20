'use client';

import { InternalPage } from '@/components/layout/internal-page';
import { UsersList } from '@/components/users/users-list';

export default function UsersPage() {
  return (
    <InternalPage title="Users" subtitle="Manage your application users">
      <UsersList />
    </InternalPage>
  );
}
