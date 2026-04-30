import React from "react";
import { type DocFile } from "@/42go/utils/docs";
import { SidebarContent } from "@/42go/components/docs/SidebarContent";
import { MobileSidebar } from "@/42go/components/docs/MobileSidebar";

export const DocLayout = ({
  doc,
  basePath,
  children,
}: {
  doc: DocFile | null;
  basePath: string;
  children: React.ReactNode;
}) => {
  if (!doc) {
    return <div className="w-full max-w-6xl mx-auto px-4">{children}</div>;
  }

  const sidebarContent = <SidebarContent doc={doc} basePath={basePath} />;

  return (
    <main className="flex min-h-screen w-full">
      <div className="w-full flex flex-col md:grid md:grid-cols-[1fr_3fr]">
        {/* Desktop sidebar */}
        <div className="hidden md:block md:sticky md:top-0 md:self-start md:h-screen md:max-h-screen px-4">
          <div className="w-full shrink-0 border-r border-gray-200 dark:border-gray-800 pr-4 h-full">
            <div className="sticky top-16 max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden pr-2 -mr-2 py-4 ml-1 lg:ml-8">
              {sidebarContent}
            </div>
          </div>
        </div>

        {/* Mobile sidebar toggle */}
        <div className="md:hidden mt-5 mb-6 px-4">
          <MobileSidebar>{sidebarContent}</MobileSidebar>
        </div>

        <div className="min-w-0 px-4">{children}</div>
      </div>
    </main>
  );
};
