'use client';

import { InternalPage } from '@/components/layout-app/internal-page';
import { ApiErrorBoundary } from '@/components/api-error-boundary';

export default function AccountPage() {
  return (
    <ApiErrorBoundary
      fallbackTitle="Access Denied"
      fallbackMessage="You don't have permission to access the account settings."
      fullPage={true}
    >
      <InternalPage title="Account" subtitle="Manage your account settings">
        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium">Account Information</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This page will contain account management features in the future.
            </p>
          </div>
        </div>
      </InternalPage>
    </ApiErrorBoundary>
  );
}
