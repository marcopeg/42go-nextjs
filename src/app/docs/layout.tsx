import React from 'react';
import { getSidebar } from '@/lib/docs';
import DocSidebar from '@/components/DocSidebar';
import MobileSidebarToggle from '@/components/MobileSidebarToggle';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  // Try to load the sidebar content
  const sidebarContent = await getSidebar();

  return (
    <main className="flex min-h-screen">
      <div className="container mx-auto px-4 flex flex-col md:flex-row">
        {/* Show sidebar only if it exists */}
        {sidebarContent ? (
          <>
            {/* Desktop sidebar */}
            <div className="hidden md:block md:sticky md:top-0 md:self-start md:h-screen md:max-h-screen">
              <DocSidebar content={sidebarContent} />
            </div>

            {/* Mobile sidebar toggle */}
            <div className="md:hidden mb-4 mt-4">
              <MobileSidebarToggle content={sidebarContent} />
            </div>

            <div className="flex-1 min-w-0 md:pl-6">{children}</div>
          </>
        ) : (
          // No sidebar, full width content
          <div className="w-full">{children}</div>
        )}
      </div>
    </main>
  );
}
