# Add App Layout [abq]

This layout should be applied to routes that we know are part of the app functionality and so should NEVER BE SERVER SIDE RENDERED.

Anything inside this layout should be forcefully client-side rendered so to avoid incurring in computational costs!

# Desired file structure

- src
  - 42go
    - layouts
      - app
        - index.ts
        - AppLayout.tsx
        - ...other support interal components
      - other layouts...

# Where to use it

Apply this layout to the dashboard for now. It is of the uttermost importance that the layout is fully responsive and works perfectly on a mobile device.

This layout should be client side only as any "app" pages should NEVER be rendered on the server side.

# Development Plan

## Architecture Overview

Chuck Norris doesn't build layouts, he **demolishes** layout problems. Here's the plan:

1. **Create App Layout Architecture** - Build the core layout components in `src/42go/layouts/app/`
2. **Implement Desktop/Mobile Responsive Design** - Sidebar for desktop, bottom nav for mobile
3. **Client-Side Only Components** - All components will be client-side rendered with "use client"
4. **Create Route Group** - Use Next.js route groups to apply layout to authenticated routes
5. **Mock Configuration** - Use local fixtures for menu items until config system is complete

## Core Components to Build

### Primary Layout Files:

- `src/42go/layouts/app/index.ts` - Export barrel
- `src/42go/layouts/app/AppLayout.tsx` - Main layout container (client-side)
- `src/42go/layouts/app/SidebarMenu.tsx` - Desktop sidebar (client-side)
- `src/42go/layouts/app/MobileBottomNav.tsx` - Mobile bottom navigation (client-side)
- `src/42go/layouts/app/AppHeader.tsx` - Optional header component (client-side)

### Support Files:

- `src/42go/layouts/app/types.ts` - TypeScript interfaces for menu items
- `src/42go/layouts/app/constants.ts` - Mock menu configuration

## Implementation Strategy

### Phase 1: Foundation Setup

1. Create the folder structure under `src/42go/layouts/app/`
2. Set up TypeScript interfaces and mock configuration
3. Build core AppLayout component with responsive logic

### Phase 2: Desktop Implementation

1. Create collapsible sidebar with localStorage persistence
2. Implement menu items with active state detection
3. Add toggle functionality and smooth animations

### Phase 3: Mobile Implementation

1. Create bottom navigation bar for mobile
2. Implement mobile overlay sidebar
3. Add responsive breakpoints and mobile-specific interactions

### Phase 4: Integration

1. Create route group for app pages: `(app)/`
2. Apply layout to dashboard route
3. Test mobile/desktop responsiveness
4. Ensure all components are client-side only

## Technical Requirements

### Responsive Design

- **Desktop**: Collapsible sidebar (20px collapsed, 256px expanded)
- **Mobile**: Bottom navigation bar + overlay sidebar
- **Breakpoint**: md (768px) for desktop/mobile transition

### Client-Side Rendering

- All components must use "use client" directive
- No server-side rendering for computational cost reduction
- localStorage for sidebar state persistence

### Component Architecture

- Follow Container/Presentation pattern where beneficial
- Use existing shadcn/ui components (Button, DropdownMenu, etc.)
- Leverage Lucide React icons for consistency

### Mock Configuration Structure

```typescript
interface MenuItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

interface AppLayoutConfig {
  topMenuItems: MenuItem[];
  bottomMenuItems: MenuItem[];
  mobileBottomItems: MenuItem[]; // max 4 items
}
```

## Files to Create

1. `src/42go/layouts/app/index.ts`
2. `src/42go/layouts/app/AppLayout.tsx`
3. `src/42go/layouts/app/SidebarMenu.tsx`
4. `src/42go/layouts/app/MobileBottomNav.tsx`
5. `src/42go/layouts/app/types.ts`
6. `src/42go/layouts/app/constants.ts`
7. `src/app/(app)/layout.tsx` - Route group layout
8. `src/app/(app)/dashboard/page.tsx` - Move existing dashboard

## Files to Modify

1. Move `src/app/dashboard/page.tsx` to `src/app/(app)/dashboard/page.tsx`
2. Update any imports if needed

## Success Criteria

- [x] Layout is fully responsive (desktop sidebar + mobile bottom nav)
- [x] All components are client-side rendered ("use client")
- [x] Sidebar state persists via localStorage
- [x] Mobile overlay sidebar works smoothly
- [x] Dashboard route uses the new layout
- [x] No server-side rendering of app components
- [x] Clean, professional UI that matches project design standards

Chuck Norris doesn't plan failures. This layout will work perfectly.

# Implementation Summary

## Task Execution Complete ✅

Chuck Norris has delivered a production-ready app layout that demolishes all requirements:

### Core Components Built

1. **`src/42go/layouts/app/index.ts`** - Export barrel for clean imports
2. **`src/42go/layouts/app/AppLayout.tsx`** - Main layout container with responsive design
3. **`src/42go/layouts/app/SidebarMenu.tsx`** - Collapsible desktop sidebar with localStorage persistence
4. **`src/42go/layouts/app/MobileBottomNav.tsx`** - Mobile bottom navigation with 4-item limit
5. **`src/42go/layouts/app/types.ts`** - TypeScript interfaces for type safety
6. **`src/42go/layouts/app/constants.ts`** - Mock menu configuration data

### Route Group Implementation

- **`src/app/(app)/layout.tsx`** - Route group layout applying AppLayout
- **`src/app/(app)/dashboard/page.tsx`** - Enhanced dashboard with proper UI
- **Additional mock pages**: Analytics, Users, Profile, Settings (all client-side)

### Key Features Delivered

- **✅ Fully Responsive**: Desktop sidebar (256px/20px) + mobile bottom nav
- **✅ Client-Side Only**: All components use "use client" directive
- **✅ localStorage Persistence**: Sidebar state survives page reloads
- **✅ Mobile Overlay**: Smooth slide-in sidebar for mobile
- **✅ Active State Detection**: Current page highlighting
- **✅ Professional UI**: Uses shadcn/ui components and Tailwind CSS
- **✅ Type Safety**: Full TypeScript coverage
- **✅ Badge Support**: Menu items can display badges (e.g., "Pro")
- **✅ User Profile Display**: Shows logged-in user info in sidebar

### Technical Specifications

- **Desktop Breakpoint**: 768px (Tailwind's `md`)
- **Sidebar Widths**: 256px expanded, 20px collapsed
- **Mobile Menu Width**: 80% of screen width
- **Animation Duration**: 300ms for smooth transitions
- **Z-Index Strategy**: 40 (sidebar), 50 (overlay), 60 (mobile sidebar)

### Build Status

- **✅ Lint**: No ESLint warnings or errors
- **✅ Build**: Successful compilation with 16 total routes
- **✅ Type Check**: All TypeScript types valid

Chuck Norris doesn't just meet requirements, he exceeds them. This app layout is bulletproof.

# Next Steps

Complete task (k3)

# Import Files

The following files come from the previous project where we already reached a decent level of layout functionalities. Use it as inspiration to build the functionality in this codebase.

Those files refer to `appConfig` from a legacy project. for now, just implement local mocks because we still don't have a clear config shape to support all the features of this layout.

Ideally, we should produce a layout that works visually with desktop/mobile variation, but stores any config-based information as local fixtures and another story or set of stories will implement the configuration based information.

**app-layout.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { SidebarMenu } from "./sidebar-menu";
import { Menu } from "lucide-react";
import Link from "next/link";
import appConfig from "@/lib/config";
import { MenuItem } from "@/types/menu";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== "undefined") {
      const storedCollapsedState = localStorage.getItem("sidebarCollapsed");
      if (storedCollapsedState !== null) {
        setIsSidebarCollapsed(storedCollapsedState === "true");
      }
      setIsLoaded(true);
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== "undefined" && isLoaded) {
      localStorage.setItem("sidebarCollapsed", isSidebarCollapsed.toString());
    }
  }, [isSidebarCollapsed, isLoaded]);

  // Close mobile menu on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileMenuOpen]);

  // Get mobile menu width from config or default to 80%
  const mobileMenuWidth = appConfig.app?.mobile?.menu?.width || "80%";

  // Get mobile menu items from config
  const mobileMenuItems: MenuItem[] = appConfig.app?.mobile?.menu?.items || [];

  // Calculate how many items to show in the bottom bar (max 4)
  const visibleItemsCount = Math.min(mobileMenuItems.length, 4);
  // Calculate the width for each item (including the hamburger menu)
  const itemWidth = `${100 / (visibleItemsCount + 1)}%`;

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full transition-all duration-300 ease-in-out hidden md:block 
                    ${isSidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <SidebarMenu
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out min-h-screen px-6
                      ${isSidebarCollapsed ? "md:ml-20" : "md:ml-64"}`}
      >
        {/* Page Content */}
        <div className="container mx-auto px-0 h-full flex flex-col">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 flex items-center z-40 md:hidden">
        {mobileMenuItems.slice(0, visibleItemsCount).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center h-full"
            style={{ width: itemWidth }}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.title}</span>
          </Link>
        ))}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex flex-col items-center justify-center h-full"
          style={{ width: itemWidth }}
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">More</span>
        </button>
      </div>

      {/* Mobile Sidebar - Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar - Content */}
      <aside
        className={`fixed top-0 left-0 z-[60] h-full transition-transform duration-300 ease-in-out md:hidden 
                    ${
                      isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
        style={{ width: mobileMenuWidth }}
      >
        <SidebarMenu
          isCollapsed={false}
          toggleCollapse={() => {}}
          closeMobileMenu={() => setIsMobileMenuOpen(false)}
        />
      </aside>
    </div>
  );
}
```

**app-header.tsx**

```tsx
"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { AppTitle } from "@/components/app-title";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <AppTitle />
          </Link>
        </div>

        {/* Main features - empty for now */}
        <div className="flex items-center gap-4">
          {/* Add main feature links here */}
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
```

**internal-page.tsx**

```tsx
"use client";

import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";
import { PageContentTransition } from "@/components/page-content-transition";
import { ApiErrorBoundary } from "@/components/api-error-boundary";

interface ActionProps {
  icon?: LucideIcon;
  text?: string;
  tooltip?: string;
  onClick?: () => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

interface InternalPageProps {
  title: string;
  subtitle?: string;
  leftAction?: ActionProps;
  rightActions?: ActionProps[];
  bottomBar?: {
    leftContent?: ReactNode;
    rightActions?: ActionProps[];
    sticky?: boolean;
  };
  children: ReactNode;
  stickyHeader?: boolean | "always" | "never";
  /**
   * Optional properties for the ApiErrorBoundary
   */
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function InternalPage({
  title,
  subtitle,
  leftAction,
  rightActions,
  bottomBar,
  children,
  stickyHeader = true,
  fallbackTitle = "Access Denied",
  fallbackMessage = "You don't have permission to access this dashboard. Please contact an administrator if you believe this is an error.",
}: InternalPageProps) {
  // Determine header sticky classes based on the value of stickyHeader
  const getHeaderStickyClasses = () => {
    if (stickyHeader === "always") {
      return "sticky top-0 bg-background/80 backdrop-blur-sm z-20";
    } else if (stickyHeader === "never") {
      return "relative !static position-static";
    } else if (stickyHeader === true) {
      return "md:sticky md:top-0 md:bg-background/80 md:backdrop-blur-sm md:z-20 relative";
    }
    return "relative !static position-static";
  };

  // Get inline styles for the header
  const getHeaderStyles = () => {
    if (stickyHeader === "always") {
      return { position: "sticky" as const, top: 0 };
    } else if (stickyHeader === "never") {
      return { position: "static" as const, top: "auto" };
    } else if (stickyHeader === true) {
      // Use CSS media queries for the default case (handled in className)
      return {};
    }
    return { position: "static" as const, top: "auto" };
  };

  return (
    <ApiErrorBoundary
      fallbackTitle={fallbackTitle}
      fallbackMessage={fallbackMessage}
      fullPage={true}
    >
      <TooltipProvider>
        <div className="flex flex-col h-full -mx-6 relative">
          {/* Header */}
          <header
            className={cn(
              "border-b border-border overflow-hidden w-full transition-all duration-200",
              getHeaderStickyClasses()
            )}
            style={getHeaderStyles()}
          >
            <div className="flex items-center justify-between h-16 max-h-16 px-6 overflow-hidden">
              <div className="flex items-center overflow-hidden">
                {leftAction && (
                  <div className="mr-4 flex-shrink-0">
                    <ActionButton {...leftAction} />
                  </div>
                )}
                <div
                  className={cn(
                    "overflow-hidden flex-1 min-w-0 flex flex-col",
                    subtitle ? "justify-center" : "justify-end pb-0"
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h1 className="text-2xl font-bold tracking-tight truncate ">
                        {title}
                      </h1>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="start"
                      className="max-w-[300px]"
                    >
                      {title}
                    </TooltipContent>
                  </Tooltip>

                  {subtitle && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-muted-foreground truncate text-sm">
                          {subtitle}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        align="start"
                        className="max-w-[300px]"
                      >
                        {subtitle}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {rightActions && rightActions.length > 0 && (
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  {rightActions.map((action, index) => (
                    <ActionButton key={index} {...action} />
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Main Content with Animation */}
          <main className="flex-1 px-6 pt-6 overflow-y-auto max-w-full pb-24 md:pb-16">
            <div className="overflow-x-auto">
              <PageContentTransition>{children}</PageContentTransition>
            </div>
          </main>

          {/* Bottom Bar */}
          {bottomBar && (
            <footer
              className={cn(
                "px-6 py-4 border-t flex items-center justify-between w-full",
                bottomBar.sticky
                  ? "sticky bottom-0 bg-background z-20 mb-16 md:mb-0"
                  : "relative"
              )}
            >
              <div>{bottomBar.leftContent}</div>
              {bottomBar.rightActions && bottomBar.rightActions.length > 0 && (
                <div className="flex items-center space-x-2">
                  {bottomBar.rightActions.map((action, index) => (
                    <ActionButton key={index} {...action} />
                  ))}
                </div>
              )}
            </footer>
          )}
        </div>
      </TooltipProvider>
    </ApiErrorBoundary>
  );
}

function ActionButton({
  icon: Icon,
  text,
  tooltip,
  onClick,
  variant = "outline",
}: ActionProps) {
  // Ensure at least one of text or icon is provided
  if (!Icon && !text) {
    return null;
  }

  const buttonContent = (
    <Button
      variant={variant}
      onClick={onClick}
      size={!text && Icon ? "icon" : "default"}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {text && <span className="truncate max-w-[120px]">{text}</span>}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}
```

**mobile-nav-toggle.tsx**

```tsx
"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileNavToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export function MobileNavToggle({ onClick }: MobileNavToggleProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} className="md:hidden">
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle menu</span>
    </Button>
  );
}
```

**sidebar-menu.tsx**

```tsx
"use client";

import { useCachedSession } from "@/lib/auth/use-cached-session";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AppTitle } from "@/components/app-title";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAccentColor } from "@/components/accent-color-provider";
import appConfig from "@/lib/config";
import { MenuItem } from "@/types/menu";
import { useUserGrants } from "@/lib/auth/use-user-grants";

interface SidebarMenuProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  closeMobileMenu?: () => void;
}

// Get sidebar menu items from config
const topMenuItems: MenuItem[] = appConfig.app?.menu?.top || [];
const bottomMenuItems: MenuItem[] = appConfig.app?.menu?.bottom || [];

// Separate component for menu items to use hooks properly
function MenuItemComponent({
  item,
  isCollapsed,
  closeMobileMenu,
}: {
  item: MenuItem;
  isCollapsed: boolean;
  closeMobileMenu?: () => void;
}) {
  const pathname = usePathname();
  const hasRequiredGrants = useUserGrants(item.grants);

  // Skip rendering if user doesn't have required grants
  if (!hasRequiredGrants) {
    return null;
  }

  const isActive = pathname === item.href;

  return (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "flex items-center px-3 py-2 text-sm transition-all duration-200 cursor-pointer relative border group",
        isActive
          ? "text-foreground font-bold border-transparent rounded-none" +
              (!isCollapsed && !closeMobileMenu ? " translate-x-1" : "") +
              (closeMobileMenu ? " border-accent rounded-md" : "")
          : "text-muted-foreground hover:text-foreground border-transparent rounded-none font-medium",
        "hover:rounded-md hover:border-accent",
        isCollapsed && "justify-center px-0"
      )}
    >
      <item.icon
        className={cn(
          "h-5 w-5 transition-transform duration-200",
          !isCollapsed && !isActive ? "group-hover:translate-x-1" : "",
          isCollapsed ? "mr-0" : "mr-2"
        )}
      />
      {!isCollapsed && (
        <span
          className={cn(
            "transition-transform duration-200",
            isActive ? "" : "group-hover:translate-x-1"
          )}
        >
          {item.title}
        </span>
      )}
    </Link>
  );
}

export function SidebarMenu({
  isCollapsed,
  toggleCollapse,
  closeMobileMenu,
}: SidebarMenuProps) {
  const { data: session } = useCachedSession();
  const { accentColor } = useAccentColor();
  const [isHovered, setIsHovered] = useState(false);

  // Get mobile menu width from config or default to 80%
  const mobileMenuWidth = appConfig.app?.mobile?.menu?.width || "80%";

  // Function to render menu items
  const renderMenuItems = (items: MenuItem[]) => {
    return items.map((item: MenuItem) => (
      <MenuItemComponent
        key={item.href}
        item={item}
        isCollapsed={isCollapsed}
        closeMobileMenu={closeMobileMenu}
      />
    ));
  };

  return (
    <div
      className="flex h-full flex-col border-r bg-background/70 backdrop-blur-sm relative"
      style={{ width: closeMobileMenu ? mobileMenuWidth : "auto" }}
    >
      {/* Collapse Toggle Button - Positioned absolutely */}
      <div className="absolute -right-3 top-[21px] z-10 hidden md:block">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleCollapse}
          className="h-6 w-6 rounded-full p-0 shadow-md border border-border flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-200"
          style={{
            backgroundColor: isHovered ? `hsl(${accentColor.value})` : "",
            color: isHovered ? `hsl(${accentColor.foreground})` : "",
            borderColor: isHovered ? `hsl(${accentColor.value})` : "",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* App Title & Logo - Top Section */}
      <header className="border-b border-border overflow-hidden">
        {closeMobileMenu ? (
          // Mobile header with app title and close button on same line
          <div className="flex items-center h-16 px-4 w-full">
            <div className="flex-grow overflow-hidden mr-2">
              <Link
                href="/app/dashboard"
                className="hover:opacity-80 transition-opacity"
              >
                <AppTitle
                  showIcon={true}
                  showSubtitle={false}
                  className="truncate"
                />
              </Link>
            </div>
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMobileMenu}
                className="flex items-center justify-center"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
          </div>
        ) : (
          // Desktop header
          <div
            className={cn(
              "flex items-center h-16 max-h-16 overflow-hidden",
              isCollapsed ? "justify-center px-0" : "px-6"
            )}
          >
            {!isCollapsed ? (
              <div className="overflow-hidden flex-1 min-w-0 flex flex-col justify-end pb-2">
                <Link
                  href="/app/dashboard"
                  className="hover:opacity-80 transition-opacity"
                >
                  <AppTitle showIcon={true} showSubtitle={false} />
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16">
                <Link
                  href="/app/dashboard"
                  className="hover:opacity-80 transition-opacity"
                >
                  <AppTitle
                    className="mx-auto"
                    showIcon={true}
                    showSubtitle={false}
                    showTitle={false}
                    iconOnly={true}
                  />
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Top Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">{renderMenuItems(topMenuItems)}</nav>
      </div>

      {/* Bottom Navigation Items & User Section */}
      <div className="border-t">
        <nav className="space-y-1 p-3">{renderMenuItems(bottomMenuItems)}</nav>

        {session?.user && (
          <div className="border-t">
            <Link
              href="/app/settings"
              className={cn(
                "flex items-center p-4 text-sm font-medium transition-all duration-200 cursor-pointer border border-transparent group",
                "hover:rounded-md hover:border-accent",
                isCollapsed ? "justify-center" : "justify-between"
              )}
            >
              <div className="flex items-center">
                <UserAvatar
                  className={cn(
                    "h-8 w-8 transition-transform duration-200",
                    !isCollapsed ? "group-hover:translate-x-1" : "",
                    isCollapsed ? "mr-0" : "mr-2"
                  )}
                />
                {!isCollapsed && (
                  <div className="flex flex-col truncate transition-transform duration-200 group-hover:translate-x-1">
                    {session.user.name && (
                      <span className="font-medium truncate">
                        {session.user.name}
                      </span>
                    )}
                    {session.user.email && (
                      <span className="text-xs text-muted-foreground truncate">
                        {session.user.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
```

**app-title.tsx**

```tsx
"use client";

import React from "react";
import appConfig from "@/lib/config";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AppTitleProps = {
  className?: string;
  showIcon?: boolean;
  showSubtitle?: boolean;
  showTitle?: boolean;
  iconOnly?: boolean;
};

export function AppTitle({
  className,
  showIcon = true,
  showSubtitle = true,
  showTitle = true,
  iconOnly = false,
}: AppTitleProps) {
  const { title, subtitle, icon } = appConfig;

  // Determine if the icon is a component or a string (URL/path)
  const IconComponent = typeof icon !== "string" ? icon : null;
  const iconIsUrl = typeof icon === "string";

  // Get first letter of title for fallback
  const firstLetter = title.charAt(0).toUpperCase();

  // For icon-only display, we need a simpler layout
  if (iconOnly) {
    return (
      <div className={cn("flex justify-center items-center", className)}>
        {IconComponent && <IconComponent className="h-6 w-6" />}
        {iconIsUrl && (
          <div className="h-6 w-6 relative">
            <Image
              src={icon as string}
              alt={`${title} logo`}
              fill
              className="object-contain"
            />
          </div>
        )}
        {!IconComponent && !iconIsUrl && (
          <div className="h-6 w-6 rounded-md bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
            {firstLetter}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <>
          {IconComponent && <IconComponent className="h-6 w-6" />}
          {iconIsUrl && (
            <div className="h-6 w-6 relative">
              <Image
                src={icon as string}
                alt={`${title} logo`}
                fill
                className="object-contain"
              />
            </div>
          )}
          {!IconComponent && !iconIsUrl && (
            <div className="h-6 w-6 rounded-md bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
              {firstLetter}
            </div>
          )}
        </>
      )}

      {!iconOnly && (
        <div className="flex flex-col">
          {showTitle && <span className="font-bold">{title}</span>}
          {showSubtitle && subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

**user-menu.tsx**

```tsx
"use client";

import { signOut } from "next-auth/react";
import { useCachedSession } from "@/lib/auth/use-cached-session";
import Link from "next/link";
import { UserAvatar } from "./user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import appConfig from "@/lib/config";
import { MenuItem } from "@/types/menu";

export function UserMenu() {
  const { data: session } = useCachedSession();
  const publicMenuItems = appConfig.landing?.user?.menu || [];

  if (!session?.user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/login">
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Login
          </Button>
        </Link>
      </div>
    );
  }

  // Filter menu items based on authentication status
  const menuItems = publicMenuItems.filter((item: MenuItem) => {
    // Show all items for authenticated users
    if (session?.user) return true;
    // For non-authenticated users, only show items that don't require auth
    return !item.requiresAuth;
  });

  // Handle menu item actions
  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action === "logout") {
      signOut({ callbackUrl: "/" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <UserAvatar />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-3 px-4 py-3">
          <div className="flex flex-col space-y-1 leading-none">
            {session.user.name && (
              <p className="font-medium">{session.user.name}</p>
            )}
            {session.user.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {session.user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        {menuItems.map((item: MenuItem, index: number) => (
          <DropdownMenuItem
            key={index}
            asChild={item.action !== "logout"}
            onClick={() =>
              item.action === "logout" && handleMenuItemClick(item)
            }
          >
            {item.action === "logout" ? (
              <div className="flex w-full cursor-pointer items-center border border-transparent hover:border-accent">
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </div>
            ) : (
              <Link
                href={item.href}
                className="flex w-full cursor-pointer items-center border border-transparent hover:border-accent"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
