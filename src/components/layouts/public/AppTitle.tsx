"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { AppConfig } from "@/lib/config/app-config";

type AppTitleProps = {
  className?: string;
  showIcon?: boolean;
  showSubtitle?: boolean;
  showTitle?: boolean;
  iconOnly?: boolean;
  appConfig?: AppConfig;
};

export function AppTitle({
  className,
  showIcon = true,
  showSubtitle = true,
  showTitle = true,
  iconOnly = false,
  appConfig,
}: AppTitleProps) {
  if (!appConfig) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-6 w-6 rounded-md bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
          ?
        </div>
        {!iconOnly && <span className="font-bold">Loading...</span>}
      </div>
    );
  }

  const { name: title, logo: icon } = appConfig;
  const subtitle = appConfig.meta?.description || "";

  // Determine if the icon is a component or a string (URL/path)
  const iconIsUrl = typeof icon === "string";

  // Get first letter of title for fallback
  const firstLetter = title?.charAt(0).toUpperCase() || "A";

  // For icon-only display, we need a simpler layout
  if (iconOnly) {
    return (
      <div className={cn("flex justify-center items-center", className)}>
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
        {!iconIsUrl && (
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
          {!iconIsUrl && (
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
