// Specialized Block Component Types
import { type TextBlock } from "./content/TextBlock";
import { type HeroBlock } from "./content/HeroBlock";
import { type DemoBlock } from "./content/DemoBlock";

// Union type for all Block Components
export type Block = TextBlock | HeroBlock | DemoBlock;

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
