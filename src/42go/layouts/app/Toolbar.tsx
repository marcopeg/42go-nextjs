"use client";

import Image from "next/image";
import { ToolbarActions } from "./ToolbarActions";
import { type TActionItem, type BackBtnConfig } from "./types";
import { BackBtn as BackButton } from "./BackBtn";

interface ToolbarProps {
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }> | string;
  actions?: TActionItem[];
  className?: string;
  backBtn?: BackBtnConfig;
}

export const Toolbar = ({
  title,
  subtitle,
  icon,
  actions,
  className,
  backBtn,
}: ToolbarProps) => {
  const hasBack = !!backBtn?.to;

  // Render icon element
  const renderIcon = () => {
    if (!icon) return null;

    // Icon is a React component (Lucide icon)
    if (
      typeof icon === "function" ||
      (typeof icon === "object" && icon !== null)
    ) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="h-5 w-5" />;
    }

    // Icon is a URL/path to an image
    if (typeof icon === "string") {
      return (
        <div className="h-5 w-5 relative">
          <Image src={icon} alt="Icon" fill className="object-contain" />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={`flex h-16 items-center justify-between gap-3 px-4 py-4 md:px-6 ${
        className || ""
      }`}
    >
      {/* Left: optional mobile back + icon + title */}
      <div className="flex min-w-0 items-center gap-3">
        {hasBack && <BackButton backBtn={backBtn!} />}
        {renderIcon()}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Toolbar Actions on the right */}
      <ToolbarActions actions={actions} />
    </div>
  );
};
