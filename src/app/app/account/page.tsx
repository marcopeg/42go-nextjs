'use client';

import { InternalPage } from '@/components/layout-app/internal-page';

export default function AccountPage() {
  return (
    <InternalPage
      title="Account"
      subtitle="Manage your account settings"
      fallbackMessage="You don't have permission to access the account settings."
    >
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="text-lg font-medium">Account Information</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This page will contain account management features in the future.
          </p>
        </div>
      </div>
    </InternalPage>
  );
}
