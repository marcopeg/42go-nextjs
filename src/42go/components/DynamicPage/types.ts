// Specialized Block Component Types
import type { ContentBlockItem } from "@/42go/components/ContentBlock/server";

// Page configuration
export interface Page {
  items: ContentBlockItem[];
  meta?: {
    title?: string;
    description?: string;
  };
}

// Pages collection
export type TDynamicPage = Record<string, Page>;
