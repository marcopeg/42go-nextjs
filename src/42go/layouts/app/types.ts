import { LucideIcon } from "lucide-react";
import { type TLinkBlock } from "@/42go/components/ContentBlock/blocks/LinkBlock";
import { type TComponentBlock } from "@/42go/components/ContentBlock/blocks/ComponentBlock";

// AppLayout-specific toolbar action type: only link and component blocks
export type TActionItem = TLinkBlock | TComponentBlock;

export interface TAppLayoutNavItem {
  id?: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface AppLayoutConfig {
  topMenuItems: TAppLayoutNavItem[];
  bottomMenuItems: TAppLayoutNavItem[];
  mobileBottomItems: TAppLayoutNavItem[]; // max 4 items
  mobileMenuWidth?: string;
}

export interface SidebarMenuProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  closeMobileMenu?: () => void;
}

export interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: TActionItem[];
  stickyHeader?: boolean;
}
