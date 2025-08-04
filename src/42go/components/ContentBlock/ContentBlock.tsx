import type { ContentBlock as ContentBlockItem } from "./types";
import HeroBlock from "./blocks/HeroBlock";
import DemoBlock from "./blocks/DemoBlock";
import MarkdownBlock from "./blocks/MarkdownBlock";
import ComponentBlock from "./blocks/ComponentBlock";
import LinkBlock from "./blocks/LinkBlock";

interface ContentBlockProps {
  items: ContentBlockItem[];
}

function renderComponent(component: ContentBlockItem, index: number) {
  switch (component.type) {
    case "hero":
      return <HeroBlock key={index} data={component} />;

    case "demo":
      return <DemoBlock key={index} data={component} />;

    case "markdown":
      // Pass details as 'data' prop for uniformity
      return <MarkdownBlock key={index} data={component} />;

    case "component":
      // Use the default export from ComponentBlock
      return <ComponentBlock key={index} data={component} />;

    case "link":
      return <LinkBlock key={index} data={component} />;

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

export const ContentBlock = ({ items }: ContentBlockProps) => {
  return items.map((component, index) => renderComponent(component, index));
};
