import type { Page } from "./types";
import ContentBlock from "@/42go/components/ContentBlock";

interface PageProps {
  data?: Page | null;
  name?: string;
}

export const DynamicPage = ({ data, name }: PageProps) => {
  // Handle null/undefined data
  if (!data) {
    // Show warning in development
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Page Content Missing{name ? ` (${name})` : ""}
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            No page data provided to the Page component
            {name ? ` for "${name}"` : ""}.<br />
            <i>This warning is only visible in development.</i>
          </p>
        </div>
      );
    }

    // Return nothing in production
    return null;
  }
  const { items, meta } = data;

  return (
    <div className="page-content space-y-8">
      {meta?.title && (
        <div className="page-header">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {meta.title}
          </h1>
          {meta.description && (
            <p className="text-muted-foreground">{meta.description}</p>
          )}
        </div>
      )}

      <div className="page-body space-y-6">
        <ContentBlock items={items} />
      </div>
    </div>
  );
};
