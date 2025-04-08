'use client';

import { InternalPage } from '@/components/layout-app/internal-page';

export default function SubscriptionPage() {
  return (
    <InternalPage
      title="Subscription"
      subtitle="Manage your subscription plan"
      fallbackMessage="You don't have permission to access the subscription settings."
    >
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="text-lg font-medium">Subscription Information</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This page will contain subscription management features in the future.
          </p>
        </div>
      </div>
    </InternalPage>
  );
}
