import type { ComponentType } from "react";
import { type TLinkBlock } from "@/42go/components/ContentBlock/blocks/LinkBlock";
import { type TComponentBlock } from "@/42go/components/ContentBlock/blocks/ComponentBlock";

// PublicLayout-specific toolbar action type: only link and component blocks for SSR
export type TActionItem = TLinkBlock | TComponentBlock;

// Toolbar configuration interface (moved from AppConfig.ts)
export interface TPublicLayoutToolbar {
  title?: string;
  subtitle?: string;
  icon?: string | ComponentType<{ className?: string }>;
  href?: string;
  actions?: TActionItem[]; // Now uses the restricted type
}
