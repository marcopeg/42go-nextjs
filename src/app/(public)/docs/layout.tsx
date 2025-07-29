import React from "react";
import { notFound } from "next/navigation";
import { getSidebar } from "@/lib/docs";
import DocSidebar from "@/components/docs/DocSidebar";
import MobileSidebarToggle from "@/components/docs/MobileSidebarToggle";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Try to load the sidebar content
    const sidebarContent = await getSidebar();

    return (
      <main className="flex min-h-screen w-full">
        {/* Show sidebar only if it exists */}
        {sidebarContent ? (
          <div className="w-full flex flex-col md:grid md:grid-cols-[1fr_3fr]">
            {/* Desktop sidebar */}
            <div className="hidden md:block md:sticky md:top-0 md:self-start md:h-screen md:max-h-screen px-4">
              <DocSidebar content={sidebarContent} />
            </div>

            {/* Mobile sidebar toggle */}
            <div className="md:hidden mt-5 mb-6 px-4">
              <MobileSidebarToggle content={sidebarContent} />
            </div>

            <div className="min-w-0 px-4">{children}</div>
          </div>
        ) : (
          // No sidebar, full width content with container for readability
          <div className="w-full max-w-6xl mx-auto px-4">{children}</div>
        )}
      </main>
    );
  } catch {
    notFound();
  }
}
