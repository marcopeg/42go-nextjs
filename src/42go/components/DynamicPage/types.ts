// Specialized Block Component Types
import type { ContentBlock } from "@/42go/components/ContentBlock";

// Page configuration
export interface Page {
  items: ContentBlock[];
  meta?: {
    title?: string;
    description?: string;
  };
}

// Pages collection
export type Pages = Record<string, Page>;
