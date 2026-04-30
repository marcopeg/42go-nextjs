import React from "react";
import { readDoc } from "@/42go/utils/docs";
import { DocLayout as DocLayoutComponent } from "@/42go/components/docs/DocLayout";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = await readDoc("SIDEBAR");
  return (
    <DocLayoutComponent doc={sidebar} basePath="docs">
      {children}
    </DocLayoutComponent>
  );
}
