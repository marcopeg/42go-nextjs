"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/42go/utils/utils";
import { useAppConfig } from "@/42go/config/use-app-config";
import { TAppLayoutNavItem } from "./types";
import { ProtectComponent } from "@/42go/policy/client";

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export const MobileBottomNav = ({ onMoreClick }: MobileBottomNavProps) => {
  const pathname = usePathname();
  const config = useAppConfig();

  // Get mobile bottom items from app config or fallback to empty array
  const mobileBottomItems: TAppLayoutNavItem[] =
    config?.app?.menu?.mobile?.items || [];
  const disableMore = config?.app?.menu?.mobile?.disableMore ?? false;

  // Calculate how many items to show in the bottom bar (max 4)
  const visibleItemsCount = Math.min(mobileBottomItems.length, 4);
  // Calculate the width for each item (including the hamburger menu if enabled)
  const itemWidth = `${100 / (visibleItemsCount + (disableMore ? 0 : 1))}%`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border h-16 flex items-center z-40 md:hidden">
      {mobileBottomItems.slice(0, visibleItemsCount).map((item) => {
        const isActive = pathname === item.href;
        const itemKey = item.id || `${item.href}-${item.title}`;

        const node = (
          <Link
            key={itemKey}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center h-full transition-colors duration-200",
              isActive
                ? "text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={{ width: itemWidth }}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1 font-medium">{item.title}</span>
          </Link>
        );

        if (!item.policy) return node;
        return (
          <ProtectComponent
            key={`pc-${itemKey}`}
            policy={item.policy}
            renderOnLoading={() => null}
            renderOnError={() => null}
          >
            {node}
          </ProtectComponent>
        );
      })}

      {!disableMore && (
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center h-full text-muted-foreground hover:text-foreground transition-colors duration-200"
          style={{ width: itemWidth }}
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1 font-medium">More</span>
        </button>
      )}
    </div>
  );
};
