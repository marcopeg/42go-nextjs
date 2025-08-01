// Specialized Block Component Types
import { type HeroBlock } from "./blocks/HeroBlock";
import { type DemoBlock } from "./blocks/DemoBlock";
import { type MarkdownBlock } from "./blocks/MarkdownBlock";
import { type ComponentBlock } from "./blocks/ComponentBlock";

// Exported Block Types
export type { HeroBlock, DemoBlock, MarkdownBlock, ComponentBlock };

// Union type for all Block Components
export type Block = HeroBlock | DemoBlock | MarkdownBlock | ComponentBlock;

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
