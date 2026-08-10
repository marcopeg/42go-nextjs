"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/42go/utils/utils";
import { useAppConfig } from "@/42go/config/use-app-config";
import { TAppLayoutNavItem } from "./types";
import { ProtectComponent } from "@/42go/policy/client";
import { filterUserFeatureFlaggedMenuItems } from "./menu-visibility";

interface MobileBottomNavProps {
  onMoreClick: () => void;
  userFeatureFlags?: Readonly<Record<string, unknown>> | null;
}

export const MobileBottomNav = ({
  onMoreClick,
  userFeatureFlags = null,
}: MobileBottomNavProps) => {
  const pathname = usePathname();
  const config = useAppConfig();

  // Get mobile bottom items from app config or fallback to empty array
  const mobileBottomItems: TAppLayoutNavItem[] =
    filterUserFeatureFlaggedMenuItems(
      config?.app?.menu?.mobile?.items || [],
      userFeatureFlags
  );
  const disableMore = config?.app?.menu?.mobile?.disableMore ?? false;
  const morePolicy = config?.app?.menu?.mobile?.more?.policy;

  // Calculate how many items to show in the bottom bar (max 4)
  const visibleItemsCount = Math.min(mobileBottomItems.length, 4);
  const moreButton = (
    <button
      type="button"
      onClick={onMoreClick}
      className="flex min-w-0 flex-1 flex-col items-center justify-center h-full text-muted-foreground hover:text-foreground transition-colors duration-200"
    >
      <Menu className="h-5 w-5" />
      <span className="text-xs mt-1 font-medium">More</span>
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border h-16 flex items-center z-40 md:hidden">
      {mobileBottomItems.slice(0, visibleItemsCount).map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const itemKey = item.id || `${item.href}-${item.title}`;

        const node = (
          <Link
            key={itemKey}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center h-full transition-colors duration-200",
              isActive
                ? "text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
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

      {!disableMore &&
        (morePolicy ? (
          <ProtectComponent
            policy={morePolicy}
            renderOnLoading={() => null}
            renderOnError={() => null}
          >
            {moreButton}
          </ProtectComponent>
        ) : (
          moreButton
        ))}
    </div>
  );
};
