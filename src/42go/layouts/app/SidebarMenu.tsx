"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/42go/utils/utils";
import { useSession } from "next-auth/react";
import { useAppConfig } from "@/42go/config/use-app-config";
import { SidebarMenuProps, TAppLayoutNavItem } from "./types";
import { ProtectComponent } from "@/42go/policy/client";
import { AppTitle } from "./AppTitle";

export const SidebarMenu = ({
  isCollapsed,
  toggleCollapse,
  closeMobileMenu,
}: SidebarMenuProps) => {
  const { data: session } = useSession();
  const config = useAppConfig();
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Get menu items from app config or fallback to empty arrays
  const topMenuItems = config?.app?.menu?.top?.items || [];
  const bottomMenuItems = config?.app?.menu?.bottom?.items || [];

  // Function to render a single menu link body
  const renderSingleItem = (item: TAppLayoutNavItem) => {
    const isActive = pathname === item.href;
    const itemKey = item.id || `${item.href}-${item.title}`;

    return (
      <Link
        key={itemKey}
        href={item.href}
        onClick={closeMobileMenu}
        className={cn(
          "flex items-center px-3 py-2 text-sm transition-all duration-200 cursor-pointer relative group rounded-md border border-transparent",
          isActive
            ? "text-foreground font-bold bg-accent/10 border-transparent group-hover:border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/5 font-medium",
          isCollapsed && "justify-center px-2",
          "hover:border-primary hover:border"
        )}
        style={{
          borderWidth: undefined, // fallback to class
          ...(isActive ? {} : { "--tw-border-opacity": "1", borderWidth: 1 }),
        }}
      >
        <item.icon
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isCollapsed ? "mr-0" : "mr-3"
          )}
        />
        {!isCollapsed && (
          <div
            className={cn(
              "flex items-center justify-between w-full transition-all duration-200",
              "group-hover:ml-2 ml-0"
            )}
            style={{
              transitionProperty: "margin-left",
            }}
          >
            <span>{item.title}</span>
            {item.badge && (
              <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  // Function to render menu items (with optional policy wrapper)
  const renderMenuItems = (items: TAppLayoutNavItem[]) => {
    return items.map((item) => {
      if (!item.policy) return renderSingleItem(item);
      const key = item.id || `${item.href}-${item.title}`;
      return (
        <ProtectComponent
          key={key}
          policy={item.policy}
          renderOnLoading={() => null}
          renderOnError={() => null}
        >
          {renderSingleItem(item)}
        </ProtectComponent>
      );
    });
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-background/95 backdrop-blur-sm relative",
        closeMobileMenu ? "w-full" : "border-r"
      )}
      style={{ width: closeMobileMenu ? "100%" : "auto" }}
    >
      {/* Collapse Toggle Button - Desktop only */}
      {!closeMobileMenu && (
        <div className="absolute -right-3 top-[21px] z-10 hidden md:block">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleCollapse}
            className={cn(
              "h-6 w-6 rounded-full p-0 shadow-md border flex items-center justify-center transition-all duration-200",
              "bg-background border-border hover:bg-primary hover:border-primary"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-colors duration-200",
                  isHovered
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                )}
              />
            ) : (
              <ChevronLeft
                className={cn(
                  "h-3 w-3 transition-colors duration-200",
                  isHovered
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                )}
              />
            )}
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border overflow-hidden">
        {closeMobileMenu ? (
          // Mobile header with close button
          <div className="flex items-center justify-between h-16 px-4">
            <h2 className="font-semibold text-lg">Menu</h2>
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
        ) : (
          // Desktop header
          <div
            className={cn(
              "flex items-center h-16 transition-all duration-300",
              isCollapsed ? "justify-center px-2" : "px-4"
            )}
          >
            {!isCollapsed ? <AppTitle /> : <AppTitle collapsed />}
          </div>
        )}
      </header>

      {/* Top Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">{renderMenuItems(topMenuItems)}</nav>
      </div>

      {/* Bottom Navigation Items & User Section - Only show divider if there's content */}
      {(bottomMenuItems.length > 0 || session?.user) && (
        <div className="border-t border-border">
          {bottomMenuItems.length > 0 && (
            <nav className="space-y-1 p-3">
              {renderMenuItems(bottomMenuItems)}
            </nav>
          )}

          {session?.user && (
            <div
              className={cn(
                "p-3",
                bottomMenuItems.length > 0 && "border-t border-border"
              )}
            >
              <Link
                href="/profile"
                onClick={closeMobileMenu}
                className={cn(
                  "flex items-center px-3 py-2 text-sm transition-all duration-200 cursor-pointer relative group rounded-md border border-transparent",
                  pathname === "/profile"
                    ? "text-foreground font-bold bg-accent/10 border-transparent group-hover:border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/5 font-medium",
                  isCollapsed && "justify-center px-2",
                  "hover:border-primary hover:border"
                )}
                style={{
                  borderWidth: undefined, // fallback to class
                  ...(pathname === "/profile"
                    ? {}
                    : { "--tw-border-opacity": "1", borderWidth: 1 }),
                }}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold text-xs transition-transform duration-200",
                    isCollapsed ? "mr-0" : "mr-3"
                  )}
                >
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                {!isCollapsed && (
                  <div
                    className={cn(
                      "flex flex-col min-w-0 flex-1 transition-all duration-200",
                      "group-hover:ml-2 ml-0"
                    )}
                    style={{
                      transitionProperty: "margin-left",
                    }}
                  >
                    {session.user.name && (
                      <span className="font-medium text-sm truncate">
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
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
