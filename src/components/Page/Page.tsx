import type { Page, Block } from "./types";
import HeroBlock from "./content/HeroBlock";
import DemoBlock from "./content/DemoBlock";
import MarkdownBlock from "./content/MarkdownBlock";

interface PageProps {
  data?: Page | null;
  name?: string;
}

function renderComponent(component: Block, index: number) {
  switch (component.type) {
    case "hero":
      return <HeroBlock key={index} data={component} />;

    case "demo":
      return <DemoBlock key={index} data={component} />;

    case "markdown":
      // Pass details as 'data' prop for uniformity
      return <MarkdownBlock key={index} data={component} />;

    default:
      return (
        <div
          key={index}
          className="unknown-component p-4 border border-destructive rounded-md"
        >
          <p className="text-destructive">Unknown component type</p>
        </div>
      );
  }
}

export default function Page({ data, name }: PageProps) {
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
        {items.map((component, index) => renderComponent(component, index))}
      </div>
    </div>
  );
}
