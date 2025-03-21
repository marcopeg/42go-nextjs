'use client';

import { InternalPage } from '@/components/layout-app/internal-page';

export default function NotificationsPage() {
  return (
    <InternalPage title="Notifications" subtitle="View your notifications">
      <div className="max-w-4xl space-y-6">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-medium">Notification Center</h2>
          <p className="text-muted-foreground mt-1 mb-3">View and manage your notifications</p>
          {/* Notifications list would go here */}
          <div className="text-muted-foreground">Notifications list will be displayed here</div>
        </div>
      </div>
    </InternalPage>
  );
}
