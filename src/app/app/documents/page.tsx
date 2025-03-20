'use client';

import { InternalPage } from '@/components/layout/internal-page';

export default function DocumentsPage() {
  return (
    <InternalPage title="Documents" subtitle="Manage your documents">
      <div className="max-w-4xl space-y-6">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-medium">Document Library</h2>
          <p className="text-muted-foreground mt-1 mb-3">View and manage your documents</p>
          {/* Documents list would go here */}
          <div className="text-muted-foreground">Documents list will be displayed here</div>
        </div>
      </div>
    </InternalPage>
  );
}
