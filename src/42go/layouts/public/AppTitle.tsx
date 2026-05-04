import React from "react";
import Image from "next/image";
import { getAppID, type TAppConfig } from "@/42go/config/app-config";
import { resolveAppTitleIcon } from "@/42go/icons";

type AppTitleProps = {
  config: TAppConfig;
};

export async function AppTitle({ config }: AppTitleProps) {
  if (!config) return null;

  const appID = await getAppID();

  // Extract toolbar config with fallbacks
  const toolbarConfig = config.public?.toolbar;
  const title = toolbarConfig?.title || config.name;
  const subtitle = toolbarConfig?.subtitle || "";
  const icon = resolveAppTitleIcon(appID, config);

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
            alt={`${title} icon`}
            fill
            className="object-contain"
          />
        </div>
      );
    }

    return null;
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
