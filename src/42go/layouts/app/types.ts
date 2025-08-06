import { LucideIcon } from "lucide-react";
import type { ContentBlockItem } from "@/42go/components/ContentBlock/client";

export type AppLayoutActionItem = ContentBlockItem;

export interface AppLayoutNavItem {
  id?: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface AppLayoutConfig {
  topMenuItems: AppLayoutNavItem[];
  bottomMenuItems: AppLayoutNavItem[];
  mobileBottomItems: AppLayoutNavItem[]; // max 4 items
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
  headerActions?: AppLayoutActionItem[];
  stickyHeader?: boolean;
}
