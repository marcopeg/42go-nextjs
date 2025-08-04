// Specialized Block Component Types
import { type HeroBlock } from "./blocks/HeroBlock";
import { type DemoBlock } from "./blocks/DemoBlock";
import { type MarkdownBlock } from "./blocks/MarkdownBlock";
import { type ComponentBlock } from "./blocks/ComponentBlock";
import { type LinkBlock } from "./blocks/LinkBlock";

// Exported Block Types
export type { HeroBlock, DemoBlock, MarkdownBlock, ComponentBlock, LinkBlock };

// Union type for all Block Components
export type ContentBlock =
  | HeroBlock
  | DemoBlock
  | MarkdownBlock
  | ComponentBlock
  | LinkBlock;
