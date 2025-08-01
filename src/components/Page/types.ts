// Specialized Block Component Types
import { type HeroBlock } from "./content/HeroBlock";
import { type DemoBlock } from "./content/DemoBlock";
import { type MarkdownBlock } from "./content/MarkdownBlock";

// Union type for all Block Components
export type Block = HeroBlock | DemoBlock | MarkdownBlock;

// Page configuration
export interface Page {
  items: Block[];
  meta?: {
    title?: string;
    description?: string;
  };
}

// Pages collection
export type Pages = Record<string, Page>;
