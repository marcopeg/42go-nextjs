import React from "react";
import Image from "next/image";
import type { AppConfig } from "@/lib/config/app-config";

type AppTitleProps = {
  config: AppConfig;
};

export function AppTitle({ config }: AppTitleProps) {
  if (!config) return null;

  // Extract toolbar config with fallbacks
  const toolbarConfig = config.public?.toolbar;
  const title = toolbarConfig?.title || config.name;
  const subtitle = toolbarConfig?.subtitle || "";
  const icon = toolbarConfig?.icon || config.logo;

  // Calculate display rules from config
  const showTitle = !!title;
  const showSubtitle = !!subtitle;
  const showIcon = !!icon;

  // Determine icon type
  const IconComponent =
    typeof icon === "function" || (typeof icon === "object" && icon !== null)
      ? (icon as React.ComponentType<{ className?: string }>)
      : null;
  const iconIsUrl = typeof icon === "string";

  // Get first letter of title for fallback
  const firstLetter = title?.charAt(0).toUpperCase() || "A";

  // Render icon element
  const renderIcon = () => {
    if (!showIcon) return null;

    // Icon is a React component (Lucide icon)
    if (IconComponent) {
      return <IconComponent className="h-6 w-6" />;
    }

    // Icon is a URL/path to an image
    if (iconIsUrl) {
      return (
        <div className="h-6 w-6 relative">
          <Image
            src={icon as string}
            alt={`${title} logo`}
            fill
            className="object-contain"
          />
        </div>
      );
    }

    // Fallback to first letter of title
    return (
      <div className="h-6 w-6 rounded-md bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
        {firstLetter}
      </div>
    );
  };

  // Render title and subtitle
  const renderText = () => {
    const textElement = (
      <div className="flex flex-col">
        {showTitle && <span className="font-bold">{title}</span>}
        {showSubtitle && subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    );

    return textElement;
  };

  // Regular layout with icon and text
  const iconContent = renderIcon();
  const textContent = renderText();

  return (
    <div className="flex items-center gap-2">
      {iconContent}
      {textContent}
    </div>
  );
}
