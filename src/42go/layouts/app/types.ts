import { LucideIcon } from "lucide-react";
import { type TLinkBlock } from "@/42go/components/ContentBlock/blocks/LinkBlock";
import { type TComponentBlock } from "@/42go/components/ContentBlock/blocks/ComponentBlock";
import type { Policy, PolicyErrorCode } from "@/42go/policy/client";

// AppLayout-specific toolbar action type: only link and component blocks
export type TActionItem = TLinkBlock | TComponentBlock;

export interface TAppLayoutNavItem {
  id?: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  /**
   * Optional user-level rollout flag. The item is shown only when the current
   * user's `auth.users.feature_flags` contains this key as literal `true`.
   */
  userFeatureFlag?: string;
  /**
   * Optional visibility policy. When provided, the menu item will be rendered
   * only if the policy passes. While the policy is loading or when it fails,
   * the item is silently omitted (no placeholder/error UI inside menus).
   */
  policy?: Policy | Policy[];
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
  userFeatureFlags?: Readonly<Record<string, unknown>> | null;
  /**
   * Where to place the desktop collapse button. Defaults to "top".
   */
  collapsePosition?: "top" | "bottom";
}

export interface BackBtnConfig {
  to: string;
  label?: string; // default: "back"
  icon?: LucideIcon; // default: simple left arrow
  hideDesktop?: boolean; // when true, show only on mobile
}

export interface AppLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: string;
  /**
   * Controls the shared horizontal boundary for the toolbar, page body, and
   * sticky footer. `full` fills the post-sidebar canvas; `content` keeps all
   * three surfaces aligned to the same reading-width column on large screens.
   */
  pageWidth?: "full" | "content";
  icon?: React.ComponentType<{ className?: string }> | string;
  actions?: TActionItem[];
  stickyHeader?: boolean;
  // Rich back button configuration for the top toolbar
  backBtn?: BackBtnConfig;
  // Optional client-side policy to guard the page content visually
  policy?: Policy | Policy[];
  renderOnLoading?: () => React.ReactNode;
  renderOnError?: (args: {
    code: PolicyErrorCode;
    detail?: string;
  }) => React.ReactNode;
  /**
   * Optional sticky footer content. When provided, a sticky bottom bar is
   * rendered matching the top toolbar style (height/border) and aligned with
   * the desktop sidebar width.
   */
  footer?: React.ReactNode;
  /**
   * When true, hides the mobile bottom navigation and the slide-in mobile menu.
   * Desktop sidebar remains unaffected.
   */
  hideMobileMenu?: boolean;
  /**
   * When true, removes internal page paddings from the main content wrapper.
   * Default is false (keep paddings: px-6 pt-6 pb-20 md:pb-6).
   */
  disablePadding?: boolean;
  /**
   * When true, removes only the mobile top padding while preserving the
   * standard 24px top padding from the md breakpoint upward.
   */
  flushMobileTop?: boolean;
  /**
   * When true, mobile scrolling is contained inside the page content viewport
   * so the toolbar and bottom navigation never join document-level scrolling.
   * Desktop keeps the standard document scroll model.
   */
  containedMobileScroll?: boolean;
}
